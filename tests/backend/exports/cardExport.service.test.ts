import { describe, expect, it, vi } from "vitest";

import type { ActivityWriter } from "../../../backend/src/activity/index.js";
import type { CardService } from "../../../backend/src/cards/index.js";
import type { ConventionCard } from "../../../backend/src/cards/card.types.js";
import { createCardExportService } from "../../../backend/src/exports/index.js";
import type { Player } from "../../../backend/src/players/player.types.js";
import { err, ok, type Result } from "../../../backend/src/shared/result.js";
import type { CardValidationIssue, CardValidationService } from "../../../backend/src/validation/index.js";

function buildPlayer(overrides: Partial<Player> = {}): Player {
  const now = new Date("2026-09-02T10:00:00.000Z");

  return {
    id: "player-1",
    authUserId: "auth-user-1",
    wbfNumber: "123456",
    email: "player@example.com",
    displayName: "Test Player",
    countryOrNbo: "POL",
    verificationStatus: "verified",
    verificationSource: null,
    verificationCheckedAt: null,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function buildCard(overrides: Partial<ConventionCard> = {}): ConventionCard {
  const now = new Date("2026-09-02T10:00:00.000Z");

  return {
    id: "card-1",
    ownerPlayerId: "player-1",
    partnershipId: "partnership-1",
    sourceCardId: null,
    revisionNumber: 1,
    title: "2/1 with Alex",
    status: "active",
    cardData: { openings: { oneClub: "2+" } },
    submittedAt: now,
    partnerReviewedByPlayerId: "player-2",
    partnerReviewedAt: now,
    partnerRejectionReason: null,
    activatedAt: now,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createCardService(
  cardResult: Result<ConventionCard, "CARD_NOT_FOUND"> = ok(buildCard()),
): Pick<CardService, "getMyCard"> {
  return {
    getMyCard: vi.fn(async () => cardResult),
  };
}

function createValidationService(valid = true): CardValidationService {
  const issues: CardValidationIssue[] = valid
    ? []
    : [
        {
          code: "CARD_DATA_SECTION_REQUIRED",
          path: "cardData",
          message: "At least one WBF card section must be filled before activation.",
        },
      ];

  return {
    validateForActivation: vi.fn(() => ({
      valid,
      issues,
    })),
  };
}

function createActivityWriter(): ActivityWriter {
  return {
    recordEvent: vi.fn(),
  };
}

describe("card export service", () => {
  it("builds a print-ready export payload for an active owned card", async () => {
    const card = buildCard();
    const cards = createCardService(ok(card));
    const validation = createValidationService();
    const activity = createActivityWriter();
    const service = createCardExportService({
      cards,
      validation,
      activity,
      now: () => new Date("2026-09-03T08:00:00.000Z"),
    });

    const result = await service.prepareOwnedCardExport("card-1", buildPlayer());

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(cards.getMyCard).toHaveBeenCalledWith("card-1", "player-1");
    expect(validation.validateForActivation).toHaveBeenCalledWith(card);
    expect(activity.recordEvent).toHaveBeenCalledWith({
      eventType: "card.exported",
      actorPlayerId: "player-1",
      entityType: "card",
      entityId: "card-1",
      cardId: "card-1",
      partnershipId: "partnership-1",
      metadata: {
        format: "json",
        generatedAt: "2026-09-03T08:00:00.000Z",
      },
    });
    expect(result.data).toEqual({
      export: {
        kind: "wbf-convention-card",
        format: "json",
        version: 1,
        generatedAt: "2026-09-03T08:00:00.000Z",
      },
      layout: {
        profile: "wbf-two-page",
        pageCount: 2,
      },
      owner: {
        playerId: "player-1",
        wbfNumber: "123456",
        displayName: "Test Player",
        countryOrNbo: "POL",
      },
      card: {
        id: "card-1",
        title: "2/1 with Alex",
        revisionNumber: 1,
        status: "active",
        cardData: { openings: { oneClub: "2+" } },
        activatedAt: new Date("2026-09-02T10:00:00.000Z"),
        updatedAt: new Date("2026-09-02T10:00:00.000Z"),
      },
    });
  });

  it("blocks export for cards that are not active", async () => {
    const service = createCardExportService({
      cards: createCardService(ok(buildCard({ status: "draft", activatedAt: null }))),
      validation: createValidationService(),
    });

    const result = await service.prepareOwnedCardExport("card-1", buildPlayer());

    expect(result).toEqual({
      ok: false,
      error: "CARD_NOT_EXPORTABLE",
      message: "Only active convention cards can be exported.",
    });
  });

  it("blocks export when activation validation fails", async () => {
    const service = createCardExportService({
      cards: createCardService(ok(buildCard())),
      validation: createValidationService(false),
    });

    const result = await service.prepareOwnedCardExport("card-1", buildPlayer());

    expect(result).toEqual({
      ok: false,
      error: "CARD_NOT_READY_FOR_EXPORT",
      message: "At least one WBF card section must be filled before activation.",
    });
  });

  it("maps missing owned cards to not found", async () => {
    const service = createCardExportService({
      cards: createCardService(err("CARD_NOT_FOUND")),
      validation: createValidationService(),
    });

    const result = await service.prepareOwnedCardExport("missing-card", buildPlayer());

    expect(result).toEqual({ ok: false, error: "CARD_NOT_FOUND" });
  });
});
