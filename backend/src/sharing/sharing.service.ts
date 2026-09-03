import type { ActivityWriter } from "../activity/index.js";
import type { CardRepository } from "../cards/card.repository.js";
import type { PartnershipRepository } from "../partnerships/index.js";
import { err, ok, type Result } from "../shared/result.js";
import { generateShareToken, hashShareToken } from "./shareToken.js";
import type { CreateShareLinkResult, PublicShareLink, PublicSharedCard, ShareLink } from "./sharing.types.js";
import type { SharingRepository } from "./sharing.repository.js";

export type SharingServiceError =
  | "CARD_NOT_FOUND"
  | "CARD_NOT_SHAREABLE"
  | "PARTNERSHIP_NOT_APPROVED"
  | "SHARE_LINK_NOT_FOUND"
  | "SHARE_LINK_EXPIRY_IN_PAST"
  | "SHARE_LINK_CREATE_FAILED";

export type SharingService = {
  createShareLink(input: {
    cardId: string;
    ownerPlayerId: string;
    expiresAt?: Date | null;
  }): Promise<Result<CreateShareLinkResult, SharingServiceError>>;
  listShareLinks(cardId: string, ownerPlayerId: string): Promise<Result<PublicShareLink[], SharingServiceError>>;
  revokeShareLink(shareLinkId: string, ownerPlayerId: string): Promise<Result<PublicShareLink, SharingServiceError>>;
  getPublicSharedCard(token: string): Promise<Result<PublicSharedCard, SharingServiceError>>;
};

type SharingServiceDeps = {
  cards: CardRepository;
  partnerships: Pick<PartnershipRepository, "findById">;
  sharing: SharingRepository;
  activity?: ActivityWriter;
  now?: () => Date;
  generateToken?: () => string;
};

function toPublicShareLink(link: ShareLink): PublicShareLink {
  const { tokenHash: _tokenHash, ...publicLink } = link;
  return publicLink;
}

export function createSharingService({
  cards,
  partnerships,
  sharing,
  activity,
  now = () => new Date(),
  generateToken = generateShareToken,
}: SharingServiceDeps): SharingService {
  return {
    async createShareLink(input) {
      const currentTime = now();

      if (input.expiresAt && input.expiresAt <= currentTime) {
        return err("SHARE_LINK_EXPIRY_IN_PAST", "Share link expiry must be in the future.");
      }

      const card = await cards.findOwnedCard(input.cardId, input.ownerPlayerId);

      if (!card) {
        return err("CARD_NOT_FOUND");
      }

      if (card.status !== "active") {
        return err("CARD_NOT_SHAREABLE");
      }

      const partnership = card.partnershipId ? await partnerships.findById(card.partnershipId) : null;

      if (!partnership || partnership.status !== "approved") {
        return err("PARTNERSHIP_NOT_APPROVED");
      }

      const token = generateToken();

      try {
        const link = await sharing.create({
          cardId: card.id,
          tokenHash: hashShareToken(token),
          expiresAt: input.expiresAt,
        });

        await activity?.recordEvent({
          eventType: "share_link.created",
          actorPlayerId: input.ownerPlayerId,
          entityType: "share_link",
          entityId: link.id,
          cardId: card.id,
          partnershipId: card.partnershipId,
          shareLinkId: link.id,
          metadata: {
            expiresAt: link.expiresAt?.toISOString() ?? null,
          },
        });

        return ok({
          link: toPublicShareLink(link),
          token,
        });
      } catch (error) {
        return err("SHARE_LINK_CREATE_FAILED", error instanceof Error ? error.message : "Could not create share link.");
      }
    },

    async listShareLinks(cardId, ownerPlayerId) {
      const card = await cards.findOwnedCard(cardId, ownerPlayerId);

      if (!card) {
        return err("CARD_NOT_FOUND");
      }

      return ok((await sharing.listForCard(cardId)).map(toPublicShareLink));
    },

    async revokeShareLink(shareLinkId, ownerPlayerId) {
      const existingLink = await sharing.findByIdForOwnedCard(shareLinkId, ownerPlayerId);

      if (!existingLink) {
        return err("SHARE_LINK_NOT_FOUND");
      }

      const revoked = await sharing.revoke(shareLinkId, now());

      if (!revoked) {
        return err("SHARE_LINK_NOT_FOUND");
      }

      await activity?.recordEvent({
        eventType: "share_link.revoked",
        actorPlayerId: ownerPlayerId,
        entityType: "share_link",
        entityId: revoked.id,
        cardId: revoked.cardId,
        shareLinkId: revoked.id,
      });

      return ok(toPublicShareLink(revoked));
    },

    async getPublicSharedCard(token) {
      const sharedCard = await sharing.findPublicSharedCardByTokenHash(hashShareToken(token), now());

      if (!sharedCard) {
        return err("SHARE_LINK_NOT_FOUND");
      }

      return ok(sharedCard);
    },
  };
}
