import { describe, expect, it, vi } from "vitest";

import type { ActivityEvent, ActivityRepository, CreateActivityEventInput } from "../../../backend/src/activity/index.js";
import { createActivityService } from "../../../backend/src/activity/index.js";
import type { CardRepository } from "../../../backend/src/cards/index.js";
import type { ConventionCard } from "../../../backend/src/cards/card.types.js";

function buildActivityEvent(overrides: Partial<ActivityEvent> = {}): ActivityEvent {
  return {
    id: "event-1",
    eventType: "card.created",
    actorPlayerId: "player-1",
    entityType: "card",
    entityId: "card-1",
    cardId: "card-1",
    partnershipId: null,
    shareLinkId: null,
    metadata: {},
    createdAt: new Date("2026-09-03T10:00:00.000Z"),
    ...overrides,
  };
}

function buildCard(overrides: Partial<ConventionCard> = {}): ConventionCard {
  const now = new Date("2026-09-03T10:00:00.000Z");

  return {
    id: "card-1",
    ownerPlayerId: "player-1",
    partnershipId: null,
    sourceCardId: null,
    revisionNumber: 1,
    title: "Card",
    status: "draft",
    cardData: {},
    submittedAt: null,
    partnerReviewedByPlayerId: null,
    partnerReviewedAt: null,
    partnerRejectionReason: null,
    activatedAt: null,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createActivityRepository(seed: ActivityEvent[] = []): ActivityRepository & { created: CreateActivityEventInput[] } {
  const events = [...seed];
  const created: CreateActivityEventInput[] = [];

  return {
    created,
    async create(input) {
      created.push(input);
      const event = buildActivityEvent({
        ...input,
        id: `event-${events.length + 1}`,
        actorPlayerId: input.actorPlayerId ?? null,
        entityId: input.entityId ?? null,
        cardId: input.cardId ?? null,
        partnershipId: input.partnershipId ?? null,
        shareLinkId: input.shareLinkId ?? null,
        metadata: input.metadata ?? {},
        createdAt: input.createdAt ?? new Date("2026-09-03T10:00:00.000Z"),
      });
      events.push(event);
      return event;
    },
    async listForPlayer(_playerId, limit) {
      return events.slice(0, limit);
    },
    async listForCard(cardId, limit) {
      return events.filter((event) => event.cardId === cardId).slice(0, limit);
    },
  };
}

function createCardRepository(card: ConventionCard | null = buildCard()): Pick<CardRepository, "findOwnedCard"> {
  return {
    findOwnedCard: vi.fn(async (cardId, ownerPlayerId) => {
      if (!card) {
        return null;
      }

      return card.id === cardId && card.ownerPlayerId === ownerPlayerId ? card : null;
    }),
  };
}

describe("activity service", () => {
  it("records activity events with a service timestamp", async () => {
    const activity = createActivityRepository();
    const service = createActivityService({
      activity,
      cards: createCardRepository(),
      now: () => new Date("2026-09-03T11:00:00.000Z"),
    });

    await service.recordEvent({
      eventType: "card.created",
      actorPlayerId: "player-1",
      entityType: "card",
      entityId: "card-1",
      cardId: "card-1",
    });

    expect(activity.created[0]).toMatchObject({
      eventType: "card.created",
      actorPlayerId: "player-1",
      entityType: "card",
      entityId: "card-1",
      cardId: "card-1",
      createdAt: new Date("2026-09-03T11:00:00.000Z"),
    });
  });

  it("lists the signed-in player's activity with a bounded limit", async () => {
    const activity = createActivityRepository([buildActivityEvent(), buildActivityEvent({ id: "event-2" })]);
    const service = createActivityService({
      activity,
      cards: createCardRepository(),
    });

    const result = await service.listMyEvents("player-1", 500);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data).toHaveLength(2);
  });

  it("lists owned card history", async () => {
    const activity = createActivityRepository([buildActivityEvent(), buildActivityEvent({ id: "event-2", cardId: "card-2" })]);
    const cards = createCardRepository();
    const service = createActivityService({
      activity,
      cards,
    });

    const result = await service.listOwnedCardEvents("card-1", "player-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(cards.findOwnedCard).toHaveBeenCalledWith("card-1", "player-1");
    expect(result.data.map((event) => event.id)).toEqual(["event-1"]);
  });

  it("blocks card history for cards not owned by the player", async () => {
    const service = createActivityService({
      activity: createActivityRepository(),
      cards: createCardRepository(null),
    });

    const result = await service.listOwnedCardEvents("card-1", "player-2");

    expect(result).toEqual({ ok: false, error: "CARD_NOT_FOUND" });
  });
});
