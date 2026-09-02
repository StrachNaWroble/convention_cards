import type { ConventionCardData } from "../cards/card.types.js";
import type { CardValidationIssue } from "./cardValidation.types.js";

const WBF_SECTION_LABELS = {
  meta: "meta",
  metadata: "metadata",
  players: "players",
  system: "system",
  openings: "openings",
  notrump: "notrump",
  responses: "responses",
  rebids: "rebids",
  overcalls: "overcalls",
  doubles: "doubles",
  preempts: "preempts",
  slam: "slam",
  leads: "leads",
  leadsAndSignals: "leadsAndSignals",
  carding: "carding",
  defensive: "defensive",
  competitive: "competitive",
  notes: "notes",
} as const;

const WBF_SECTION_KEYS = new Set(Object.keys(WBF_SECTION_LABELS));
const MAX_NESTING_DEPTH = 6;
const MAX_ARRAY_ITEMS = 100;

type ValidationAccumulator = {
  issues: CardValidationIssue[];
  hasMeaningfulContent: boolean;
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function addIssue(
  issues: CardValidationIssue[],
  code: CardValidationIssue["code"],
  path: string,
  message: string,
): void {
  issues.push({ code, path, message });
}

function validateFieldValue(value: unknown, path: string, depth: number, issues: CardValidationIssue[]): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (typeof value === "boolean") {
    return true;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      addIssue(issues, "CARD_DATA_FIELD_VALUE_INVALID", path, "Card data numbers must be finite.");
      return false;
    }

    return true;
  }

  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY_ITEMS) {
      addIssue(issues, "CARD_DATA_FIELD_VALUE_INVALID", path, "Card data lists are too large.");
      return false;
    }

    let hasMeaningfulContent = false;

    value.forEach((item, index) => {
      hasMeaningfulContent = validateFieldValue(item, `${path}.${index}`, depth + 1, issues) || hasMeaningfulContent;
    });

    return hasMeaningfulContent;
  }

  if (isPlainRecord(value)) {
    if (depth >= MAX_NESTING_DEPTH) {
      addIssue(issues, "CARD_DATA_FIELD_VALUE_INVALID", path, "Card data is nested too deeply.");
      return false;
    }

    let hasMeaningfulContent = false;

    for (const [key, nestedValue] of Object.entries(value)) {
      const trimmedKey = key.trim();

      if (!trimmedKey) {
        addIssue(issues, "CARD_DATA_FIELD_PATH_REQUIRED", path, "Card data field names cannot be blank.");
        continue;
      }

      hasMeaningfulContent = validateFieldValue(nestedValue, `${path}.${trimmedKey}`, depth + 1, issues) || hasMeaningfulContent;
    }

    return hasMeaningfulContent;
  }

  addIssue(issues, "CARD_DATA_FIELD_VALUE_UNSUPPORTED", path, "Card data can only contain JSON-compatible values.");
  return false;
}

export function validateWbfCardData(cardData: ConventionCardData): ValidationAccumulator {
  const issues: CardValidationIssue[] = [];

  if (!isPlainRecord(cardData)) {
    return {
      issues: [
        {
          code: "CARD_DATA_OBJECT_REQUIRED",
          path: "cardData",
          message: "Card data must be a structured object before activation.",
        },
      ],
      hasMeaningfulContent: false,
    };
  }

  let hasMeaningfulContent = false;

  for (const [sectionKey, sectionValue] of Object.entries(cardData)) {
    const path = `cardData.${sectionKey}`;

    if (!WBF_SECTION_KEYS.has(sectionKey)) {
      addIssue(issues, "CARD_DATA_UNKNOWN_SECTION", path, `Unknown WBF card section: ${sectionKey}.`);
      continue;
    }

    if (!isPlainRecord(sectionValue)) {
      addIssue(issues, "CARD_DATA_SECTION_OBJECT_REQUIRED", path, "WBF card sections must be structured objects.");
      continue;
    }

    hasMeaningfulContent = validateFieldValue(sectionValue, path, 1, issues) || hasMeaningfulContent;
  }

  if (!hasMeaningfulContent) {
    addIssue(issues, "CARD_DATA_SECTION_REQUIRED", "cardData", "At least one WBF card section must be filled before activation.");
  }

  return {
    issues,
    hasMeaningfulContent,
  };
}
