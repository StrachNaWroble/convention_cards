import type { CardService } from "../cards/index.js";
import type { Player } from "../players/player.types.js";
import { err, ok, type Result } from "../shared/result.js";
import type { CardValidationService } from "../validation/index.js";
import type { CardExportPayload } from "./cardExport.types.js";

export type CardExportServiceError = "CARD_NOT_FOUND" | "CARD_NOT_EXPORTABLE" | "CARD_NOT_READY_FOR_EXPORT";

export type CardExportService = {
  prepareOwnedCardExport(cardId: string, owner: Player): Promise<Result<CardExportPayload, CardExportServiceError>>;
};

type CardExportServiceDeps = {
  cards: Pick<CardService, "getMyCard">;
  validation: CardValidationService;
  now?: () => Date;
};

export function createCardExportService({
  cards,
  validation,
  now = () => new Date(),
}: CardExportServiceDeps): CardExportService {
  return {
    async prepareOwnedCardExport(cardId, owner) {
      const card = await cards.getMyCard(cardId, owner.id);

      if (!card.ok) {
        return err("CARD_NOT_FOUND");
      }

      if (card.data.status !== "active") {
        return err("CARD_NOT_EXPORTABLE", "Only active convention cards can be exported.");
      }

      const validationResult = validation.validateForActivation(card.data);

      if (!validationResult.valid) {
        return err("CARD_NOT_READY_FOR_EXPORT", validationResult.issues.map((issue) => issue.message).join(" "));
      }

      return ok({
        export: {
          kind: "wbf-convention-card",
          format: "json",
          version: 1,
          generatedAt: now().toISOString(),
        },
        layout: {
          profile: "wbf-two-page",
          pageCount: 2,
        },
        owner: {
          playerId: owner.id,
          wbfNumber: owner.wbfNumber,
          displayName: owner.displayName,
          countryOrNbo: owner.countryOrNbo,
        },
        card: {
          id: card.data.id,
          title: card.data.title,
          revisionNumber: card.data.revisionNumber,
          status: card.data.status,
          cardData: card.data.cardData,
          activatedAt: card.data.activatedAt,
          updatedAt: card.data.updatedAt,
        },
      });
    },
  };
}
