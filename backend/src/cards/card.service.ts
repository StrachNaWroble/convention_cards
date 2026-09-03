import type { ActivityWriter } from "../activity/index.js";
import { err, ok, type Result } from "../shared/result.js";
import type { PartnershipRepository } from "../partnerships/partnership.repository.js";
import type { Player } from "../players/player.types.js";
import type { CardValidationService } from "../validation/index.js";
import type { CardRepository } from "./card.repository.js";
import type { ConventionCard, CreateCardDraftInput, UpdateCardDraftInput } from "./card.types.js";

const MAX_REJECTION_REASON_LENGTH = 1000;

export type CardServiceError =
  | "CARD_NOT_FOUND"
  | "CARD_NOT_EDITABLE"
  | "CARD_CREATE_FAILED"
  | "CARD_NOT_READY_FOR_ACTIVATION"
  | "CARD_NOT_APPROVED_BY_PARTNER"
  | "CARD_NOT_PENDING_REVIEW"
  | "CARD_NOT_REVISIONABLE"
  | "CARD_REVISION_ALREADY_EXISTS"
  | "PARTNERSHIP_NOT_APPROVED"
  | "REJECTION_REASON_TOO_LONG";

export type CardService = {
  createBlankDraft(input: CreateCardDraftInput): Promise<Result<ConventionCard, CardServiceError>>;
  listMyCards(ownerPlayerId: string): Promise<Result<ConventionCard[], CardServiceError>>;
  listCardsForPartnerReview(player: Player): Promise<Result<ConventionCard[], CardServiceError>>;
  getMyCard(cardId: string, ownerPlayerId: string): Promise<Result<ConventionCard, CardServiceError>>;
  createRevisionFromRejectedCard(cardId: string, ownerPlayerId: string): Promise<Result<ConventionCard, CardServiceError>>;
  autosaveDraft(input: UpdateCardDraftInput): Promise<Result<ConventionCard, CardServiceError>>;
  submitForPartnerApproval(cardId: string, ownerPlayerId: string): Promise<Result<ConventionCard, CardServiceError>>;
  approveCardAsPartner(cardId: string, player: Player): Promise<Result<ConventionCard, CardServiceError>>;
  rejectCardAsPartner(
    cardId: string,
    player: Player,
    rejectionReason?: string | null,
  ): Promise<Result<ConventionCard, CardServiceError>>;
  activateCard(cardId: string, ownerPlayerId: string): Promise<Result<ConventionCard, CardServiceError>>;
  archiveCard(cardId: string, ownerPlayerId: string): Promise<Result<ConventionCard, CardServiceError>>;
};

type CardServiceDeps = {
  cards: CardRepository;
  partnerships?: Pick<PartnershipRepository, "findById">;
  validation?: CardValidationService;
  activity?: ActivityWriter;
  now?: () => Date;
};

export function createCardService({
  cards,
  partnerships,
  validation,
  activity,
  now = () => new Date(),
}: CardServiceDeps): CardService {
  return {
    async createBlankDraft(input) {
      try {
        const card = await cards.createDraft({
          ownerPlayerId: input.ownerPlayerId,
          partnershipId: input.partnershipId ?? null,
          title: input.title?.trim() || "Untitled card",
          cardData: input.cardData ?? {},
        });

        await activity?.recordEvent({
          eventType: "card.created",
          actorPlayerId: input.ownerPlayerId,
          entityType: "card",
          entityId: card.id,
          cardId: card.id,
          partnershipId: card.partnershipId,
          metadata: {
            title: card.title,
            status: card.status,
          },
        });

        return ok(card);
      } catch (error) {
        return err("CARD_CREATE_FAILED", error instanceof Error ? error.message : "Could not create card.");
      }
    },

    async listMyCards(ownerPlayerId) {
      return ok(await cards.listByOwner(ownerPlayerId));
    },

    async listCardsForPartnerReview(player) {
      return ok(await cards.listPendingReviewForPartner(player.id, player.wbfNumber));
    },

    async getMyCard(cardId, ownerPlayerId) {
      const card = await cards.findOwnedCard(cardId, ownerPlayerId);

      if (!card) {
        return err("CARD_NOT_FOUND");
      }

      return ok(card);
    },

    async createRevisionFromRejectedCard(cardId, ownerPlayerId) {
      const existingCard = await cards.findOwnedCard(cardId, ownerPlayerId);

      if (!existingCard) {
        return err("CARD_NOT_FOUND");
      }

      if (existingCard.status !== "partner_rejected") {
        return err("CARD_NOT_REVISIONABLE");
      }

      const existingRevision = await cards.findDraftRevisionForSourceCard(existingCard.id, ownerPlayerId);

      if (existingRevision) {
        return err("CARD_REVISION_ALREADY_EXISTS");
      }

      try {
        const revision = await cards.createDraftRevisionFromCard(existingCard);

        await activity?.recordEvent({
          eventType: "card.revision_created",
          actorPlayerId: revision.ownerPlayerId,
          entityType: "card",
          entityId: revision.id,
          cardId: revision.id,
          partnershipId: revision.partnershipId,
          metadata: {
            sourceCardId: existingCard.id,
            revisionNumber: revision.revisionNumber,
          },
        });

        return ok(revision);
      } catch (error) {
        return err("CARD_CREATE_FAILED", error instanceof Error ? error.message : "Could not create card revision.");
      }
    },

    async autosaveDraft(input) {
      const existingCard = await cards.findOwnedCard(input.cardId, input.ownerPlayerId);

      if (!existingCard) {
        return err("CARD_NOT_FOUND");
      }

      if (existingCard.status !== "draft") {
        return err("CARD_NOT_EDITABLE");
      }

      const card = await cards.updateDraft(
        {
          ...input,
          title: input.title?.trim(),
        },
        now(),
      );

      if (!card) {
        return err("CARD_NOT_FOUND");
      }

      return ok(card);
    },

    async submitForPartnerApproval(cardId, ownerPlayerId) {
      const existingCard = await cards.findOwnedCard(cardId, ownerPlayerId);

      if (!existingCard) {
        return err("CARD_NOT_FOUND");
      }

      if (existingCard.status !== "draft") {
        return err("CARD_NOT_EDITABLE");
      }

      const card = await cards.updateStatus(cardId, ownerPlayerId, "pending_partner_approval", now());

      if (!card) {
        return err("CARD_NOT_FOUND");
      }

      await activity?.recordEvent({
        eventType: "card.submitted_for_approval",
        actorPlayerId: ownerPlayerId,
        entityType: "card",
        entityId: card.id,
        cardId: card.id,
        partnershipId: card.partnershipId,
      });

      return ok(card);
    },

    async approveCardAsPartner(cardId, player) {
      const existingCard = await cards.findCardForPartnerReview(cardId, player.id, player.wbfNumber);

      if (!existingCard) {
        return err("CARD_NOT_FOUND");
      }

      if (existingCard.status !== "pending_partner_approval") {
        return err("CARD_NOT_PENDING_REVIEW");
      }

      const card = await cards.updatePartnerReviewStatus({
        cardId,
        reviewedByPlayerId: player.id,
        status: "partner_approved",
        reviewedAt: now(),
      });

      if (!card) {
        return err("CARD_NOT_PENDING_REVIEW");
      }

      await activity?.recordEvent({
        eventType: "card.approved_by_partner",
        actorPlayerId: player.id,
        entityType: "card",
        entityId: card.id,
        cardId: card.id,
        partnershipId: card.partnershipId,
      });

      return ok(card);
    },

    async rejectCardAsPartner(cardId, player, rejectionReason) {
      const existingCard = await cards.findCardForPartnerReview(cardId, player.id, player.wbfNumber);

      if (!existingCard) {
        return err("CARD_NOT_FOUND");
      }

      if (existingCard.status !== "pending_partner_approval") {
        return err("CARD_NOT_PENDING_REVIEW");
      }

      const trimmedReason = rejectionReason?.trim() || null;

      if (trimmedReason && trimmedReason.length > MAX_REJECTION_REASON_LENGTH) {
        return err("REJECTION_REASON_TOO_LONG", "Rejection reason is too long.");
      }

      const card = await cards.updatePartnerReviewStatus({
        cardId,
        reviewedByPlayerId: player.id,
        status: "partner_rejected",
        reviewedAt: now(),
        rejectionReason: trimmedReason,
      });

      if (!card) {
        return err("CARD_NOT_PENDING_REVIEW");
      }

      await activity?.recordEvent({
        eventType: "card.rejected_by_partner",
        actorPlayerId: player.id,
        entityType: "card",
        entityId: card.id,
        cardId: card.id,
        partnershipId: card.partnershipId,
        metadata: {
          hasRejectionReason: Boolean(trimmedReason),
        },
      });

      return ok(card);
    },

    async activateCard(cardId, ownerPlayerId) {
      const existingCard = await cards.findOwnedCard(cardId, ownerPlayerId);

      if (!existingCard) {
        return err("CARD_NOT_FOUND");
      }

      if (existingCard.status !== "partner_approved") {
        if (existingCard.status === "pending_partner_approval" || existingCard.status === "partner_rejected") {
          return err("CARD_NOT_APPROVED_BY_PARTNER");
        }

        return err("CARD_NOT_EDITABLE");
      }

      const validationResult = validation?.validateForActivation(existingCard);

      if (validationResult && !validationResult.valid) {
        return err("CARD_NOT_READY_FOR_ACTIVATION", validationResult.issues.map((issue) => issue.message).join(" "));
      }

      const partnership = existingCard.partnershipId
        ? await partnerships?.findById(existingCard.partnershipId)
        : null;

      if (!partnership || partnership.status !== "approved") {
        return err("PARTNERSHIP_NOT_APPROVED");
      }

      const card = await cards.updateStatus(cardId, ownerPlayerId, "active", now());

      if (!card) {
        return err("CARD_NOT_FOUND");
      }

      await activity?.recordEvent({
        eventType: "card.activated",
        actorPlayerId: ownerPlayerId,
        entityType: "card",
        entityId: card.id,
        cardId: card.id,
        partnershipId: card.partnershipId,
      });

      return ok(card);
    },

    async archiveCard(cardId, ownerPlayerId) {
      const card = await cards.updateStatus(cardId, ownerPlayerId, "archived", now());

      if (!card) {
        return err("CARD_NOT_FOUND");
      }

      await activity?.recordEvent({
        eventType: "card.archived",
        actorPlayerId: ownerPlayerId,
        entityType: "card",
        entityId: card.id,
        cardId: card.id,
        partnershipId: card.partnershipId,
      });

      return ok(card);
    },
  };
}
