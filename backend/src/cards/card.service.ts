import { err, ok, type Result } from "../shared/result.js";
import type { PartnershipRepository } from "../partnerships/partnership.repository.js";
import type { CardValidationService } from "../validation/index.js";
import type { CardRepository } from "./card.repository.js";
import type { ConventionCard, CreateCardDraftInput, UpdateCardDraftInput } from "./card.types.js";

export type CardServiceError =
  | "CARD_NOT_FOUND"
  | "CARD_NOT_EDITABLE"
  | "CARD_CREATE_FAILED"
  | "CARD_NOT_READY_FOR_ACTIVATION"
  | "PARTNERSHIP_NOT_APPROVED";

export type CardService = {
  createBlankDraft(input: CreateCardDraftInput): Promise<Result<ConventionCard, CardServiceError>>;
  listMyCards(ownerPlayerId: string): Promise<Result<ConventionCard[], CardServiceError>>;
  getMyCard(cardId: string, ownerPlayerId: string): Promise<Result<ConventionCard, CardServiceError>>;
  autosaveDraft(input: UpdateCardDraftInput): Promise<Result<ConventionCard, CardServiceError>>;
  submitForPartnerApproval(cardId: string, ownerPlayerId: string): Promise<Result<ConventionCard, CardServiceError>>;
  activateCard(cardId: string, ownerPlayerId: string): Promise<Result<ConventionCard, CardServiceError>>;
  archiveCard(cardId: string, ownerPlayerId: string): Promise<Result<ConventionCard, CardServiceError>>;
};

type CardServiceDeps = {
  cards: CardRepository;
  partnerships?: Pick<PartnershipRepository, "findById">;
  validation?: CardValidationService;
  now?: () => Date;
};

export function createCardService({ cards, partnerships, validation, now = () => new Date() }: CardServiceDeps): CardService {
  return {
    async createBlankDraft(input) {
      try {
        const card = await cards.createDraft({
          ownerPlayerId: input.ownerPlayerId,
          partnershipId: input.partnershipId ?? null,
          title: input.title?.trim() || "Untitled card",
          cardData: input.cardData ?? {},
        });

        return ok(card);
      } catch (error) {
        return err("CARD_CREATE_FAILED", error instanceof Error ? error.message : "Could not create card.");
      }
    },

    async listMyCards(ownerPlayerId) {
      return ok(await cards.listByOwner(ownerPlayerId));
    },

    async getMyCard(cardId, ownerPlayerId) {
      const card = await cards.findOwnedCard(cardId, ownerPlayerId);

      if (!card) {
        return err("CARD_NOT_FOUND");
      }

      return ok(card);
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

      return ok(card);
    },

    async activateCard(cardId, ownerPlayerId) {
      const existingCard = await cards.findOwnedCard(cardId, ownerPlayerId);

      if (!existingCard) {
        return err("CARD_NOT_FOUND");
      }

      if (existingCard.status !== "pending_partner_approval") {
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

      return ok(card);
    },

    async archiveCard(cardId, ownerPlayerId) {
      const card = await cards.updateStatus(cardId, ownerPlayerId, "archived", now());

      if (!card) {
        return err("CARD_NOT_FOUND");
      }

      return ok(card);
    },
  };
}
