import type { ConventionCard } from "../cards/card.types.js";

export type CardValidationIssueCode =
  | "CARD_TITLE_REQUIRED"
  | "CARD_PARTNERSHIP_REQUIRED"
  | "CARD_DATA_OBJECT_REQUIRED"
  | "CARD_DATA_SECTION_REQUIRED"
  | "CARD_DATA_UNKNOWN_SECTION"
  | "CARD_DATA_SECTION_OBJECT_REQUIRED"
  | "CARD_DATA_FIELD_PATH_REQUIRED"
  | "CARD_DATA_FIELD_VALUE_UNSUPPORTED"
  | "CARD_DATA_FIELD_VALUE_INVALID";

export type CardValidationIssue = {
  code: CardValidationIssueCode;
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
