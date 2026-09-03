import { and, eq, gt, isNull, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import type { Database } from "../db/client.js";
import { conventionCards, partnerships, players, shareLinks } from "../db/schema.js";
import type { CreateShareLinkInput, PublicSharedCard, ShareLink } from "./sharing.types.js";

export type SharingRepository = {
  create(input: CreateShareLinkInput): Promise<ShareLink>;
  listForCard(cardId: string, limit?: number): Promise<ShareLink[]>;
  findByIdForOwnedCard(shareLinkId: string, ownerPlayerId: string): Promise<ShareLink | null>;
  revoke(shareLinkId: string, revokedAt: Date): Promise<ShareLink | null>;
  findPublicSharedCardByTokenHash(tokenHash: string, now: Date): Promise<PublicSharedCard | null>;
};

export function createDrizzleSharingRepository(db: Database): SharingRepository {
  return {
    async create(input) {
      const [link] = await db
        .insert(shareLinks)
        .values({
          cardId: input.cardId,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
        })
        .returning();

      return link;
    },

    async listForCard(cardId, limit) {
      const query = db.select().from(shareLinks).where(eq(shareLinks.cardId, cardId));

      if (limit) {
        return query.limit(limit);
      }

      return query;
    },

    async findByIdForOwnedCard(shareLinkId, ownerPlayerId) {
      const [row] = await db
        .select({ shareLink: shareLinks })
        .from(shareLinks)
        .innerJoin(conventionCards, eq(conventionCards.id, shareLinks.cardId))
        .where(and(eq(shareLinks.id, shareLinkId), eq(conventionCards.ownerPlayerId, ownerPlayerId)))
        .limit(1);

      return row?.shareLink ?? null;
    },

    async revoke(shareLinkId, revokedAt) {
      const [link] = await db
        .update(shareLinks)
        .set({ revokedAt })
        .where(eq(shareLinks.id, shareLinkId))
        .returning();

      return link ?? null;
    },

    async findPublicSharedCardByTokenHash(tokenHash, now) {
      const owner = alias(players, "owner_player");
      const partner = alias(players, "partner_player");

      const [row] = await db
        .select({
          shareLink: shareLinks,
          card: conventionCards,
          owner,
          partner,
        })
        .from(shareLinks)
        .innerJoin(conventionCards, eq(conventionCards.id, shareLinks.cardId))
        .innerJoin(owner, eq(owner.id, conventionCards.ownerPlayerId))
        .leftJoin(partnerships, eq(partnerships.id, conventionCards.partnershipId))
        .leftJoin(partner, eq(partner.id, partnerships.partnerPlayerId))
        .where(
          and(
            eq(shareLinks.tokenHash, tokenHash),
            isNull(shareLinks.revokedAt),
            or(isNull(shareLinks.expiresAt), gt(shareLinks.expiresAt, now)),
            eq(conventionCards.status, "active"),
          ),
        )
        .limit(1);

      if (!row) {
        return null;
      }

      return {
        card: {
          id: row.card.id,
          title: row.card.title,
          status: row.card.status,
          cardData: row.card.cardData,
          updatedAt: row.card.updatedAt,
        },
        players: {
          owner: {
            displayName: row.owner.displayName,
            wbfNumber: row.owner.wbfNumber,
          },
          partner: row.partner
            ? {
                displayName: row.partner.displayName,
                wbfNumber: row.partner.wbfNumber,
              }
            : null,
        },
        shareLink: {
          id: row.shareLink.id,
          expiresAt: row.shareLink.expiresAt,
          createdAt: row.shareLink.createdAt,
        },
      };
    },
  };
}
