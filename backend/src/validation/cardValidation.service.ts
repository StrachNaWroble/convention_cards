import type { ConventionCard } from "../cards/card.types.js";
import type { CardValidationIssue, CardValidationResult, CardValidationService } from "./cardValidation.types.js";
import { validateWbfCardData } from "./wbfCardData.schema.js";

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

      issues.push(...validateWbfCardData(card.cardData).issues);

      return {
        valid: issues.length === 0,
        issues,
      };
    },
  };
}
