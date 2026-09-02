import type { ConventionCard } from "../cards/card.types.js";
import type { CardValidationIssue, CardValidationResult, CardValidationService } from "./cardValidation.types.js";

function hasCardContent(cardData: ConventionCard["cardData"]): boolean {
  return typeof cardData === "object" && cardData !== null && Object.keys(cardData).length > 0;
}

export function createCardValidationService(): CardValidationService {
  return {
    validateForActivation(card) {
      const issues: CardValidationIssue[] = [];

      if (!card.title.trim()) {
        issues.push({
          code: "CARD_TITLE_REQUIRED",
          path: "title",
          message: "Card title is required before activation.",
        });
      }

      if (!card.partnershipId) {
        issues.push({
          code: "CARD_PARTNERSHIP_REQUIRED",
          path: "partnershipId",
          message: "Card must be linked to a partnership before activation.",
        });
      }

      if (!hasCardContent(card.cardData)) {
        issues.push({
          code: "CARD_DATA_REQUIRED",
          path: "cardData",
          message: "Card data is required before activation.",
        });
      }

      return {
        valid: issues.length === 0,
        issues,
      };
    },
  };
}
