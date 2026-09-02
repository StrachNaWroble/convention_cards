import { describe, expect, it } from "vitest";

import type { ConventionCard } from "../../../backend/src/cards/card.types.js";
import { createCardValidationService, validateWbfCardData } from "../../../backend/src/validation/index.js";

function buildCard(overrides: Partial<ConventionCard> = {}): ConventionCard {
  const now = new Date("2026-09-02T10:00:00.000Z");

  return {
    id: "card-1",
    ownerPlayerId: "player-1",
    partnershipId: "partnership-1",
    title: "2/1 with Alex",
    status: "pending_partner_approval",
    cardData: {
      openings: {
        oneClub: "2+",
      },
    },
    submittedAt: now,
    partnerReviewedByPlayerId: "player-2",
    partnerReviewedAt: now,
    partnerRejectionReason: null,
    activatedAt: null,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("WBF card data validation", () => {
  it("accepts structured WBF sections with meaningful values", () => {
    const result = validateWbfCardData({
      openings: {
        oneClub: "2+",
        oneDiamond: "4+",
      },
      notrump: {
        range: "15-17",
      },
    });

    expect(result).toEqual({
      hasMeaningfulContent: true,
      issues: [],
    });
  });

  it("accepts the section names used by the blank WBF template", () => {
    const result = validateWbfCardData({
      meta: {
        format: "wbf",
      },
      players: {
        northSouth: {
          playerOne: "North",
        },
      },
      system: {
        generalApproach: "2/1",
      },
      leadsAndSignals: {
        openingLeads: "3rd/5th",
      },
    });

    expect(result.issues).toEqual([]);
    expect(result.hasMeaningfulContent).toBe(true);
  });

  it("rejects unknown top-level card sections", () => {
    const result = validateWbfCardData({
      customSection: {
        oneClub: "2+",
      },
    });

    expect(result.issues).toContainEqual({
      code: "CARD_DATA_UNKNOWN_SECTION",
      path: "cardData.customSection",
      message: "Unknown WBF card section: customSection.",
    });
  });

  it("requires WBF sections to be structured objects", () => {
    const result = validateWbfCardData({
      openings: "2+ clubs",
    });

    expect(result.issues).toContainEqual({
      code: "CARD_DATA_SECTION_OBJECT_REQUIRED",
      path: "cardData.openings",
      message: "WBF card sections must be structured objects.",
    });
  });

  it("requires at least one meaningful WBF value", () => {
    const result = validateWbfCardData({
      openings: {
        oneClub: "   ",
      },
      notrump: {},
    });

    expect(result.issues).toContainEqual({
      code: "CARD_DATA_SECTION_REQUIRED",
      path: "cardData",
      message: "At least one WBF card section must be filled before activation.",
    });
  });

  it("rejects unsupported nested field values", () => {
    const result = validateWbfCardData({
      openings: {
        oneClub: () => "2+",
      },
    });

    expect(result.issues).toContainEqual({
      code: "CARD_DATA_FIELD_VALUE_UNSUPPORTED",
      path: "cardData.openings.oneClub",
      message: "Card data can only contain JSON-compatible values.",
    });
  });
});

describe("card validation service", () => {
  it("accepts an activatable card with valid WBF data", () => {
    const service = createCardValidationService();

    expect(service.validateForActivation(buildCard())).toEqual({
      valid: true,
      issues: [],
    });
  });

  it("collects activation issues for missing title, partnership, and card data", () => {
    const service = createCardValidationService();

    const result = service.validateForActivation(
      buildCard({
        title: " ",
        partnershipId: null,
        cardData: {},
      }),
    );

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "CARD_TITLE_REQUIRED",
      "CARD_PARTNERSHIP_REQUIRED",
      "CARD_DATA_SECTION_REQUIRED",
    ]);
  });
});
