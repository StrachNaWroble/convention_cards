import type { ConventionCard } from "../cards/card.types.js";

export type CardValidationIssue = {
  code: string;
  path: string;
  message: string;
};

export type CardValidationResult = {
  valid: boolean;
  issues: CardValidationIssue[];
};

export type CardValidationService = {
  validateForActivation(card: ConventionCard): CardValidationResult;
};
