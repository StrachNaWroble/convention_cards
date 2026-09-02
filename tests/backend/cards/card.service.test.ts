import { describe, expect, it } from "vitest";

import { createCardService } from "../../../backend/src/cards/card.service.js";
import type { CardRepository } from "../../../backend/src/cards/card.repository.js";
import type { CardStatus, ConventionCard } from "../../../backend/src/cards/card.types.js";

function buildCard(overrides: Partial<ConventionCard> = {}): ConventionCard {
  const now = new Date("2026-09-02T10:00:00.000Z");

  return {
    id: "card-1",
    ownerPlayerId: "player-1",
    partnershipId: null,
    title: "Untitled card",
    status: "draft",
    cardData: {},
    submittedAt: null,
    activatedAt: null,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createCardRepository(seed: ConventionCard[] = []): CardRepository {
  const cards = [...seed];

  return {
    async createDraft(input) {
      const card = buildCard({
        id: `card-${cards.length + 1}`,
        ownerPlayerId: input.ownerPlayerId,
        partnershipId: input.partnershipId,
        title: input.title,
        cardData: input.cardData,
      });

      cards.push(card);
      return card;
    },

    async listByOwner(ownerPlayerId) {
      return cards.filter((card) => card.ownerPlayerId === ownerPlayerId);
    },

    async findOwnedCard(cardId, ownerPlayerId) {
      return cards.find((card) => card.id === cardId && card.ownerPlayerId === ownerPlayerId) ?? null;
    },

    async updateDraft(input, updatedAt) {
      const card = cards.find(
        (candidate) =>
          candidate.id === input.cardId && candidate.ownerPlayerId === input.ownerPlayerId && candidate.status === "draft",
      );

      if (!card) {
        return null;
      }

      if (input.title !== undefined) {
        card.title = input.title;
      }

      if (input.cardData !== undefined) {
        card.cardData = input.cardData;
      }

      card.updatedAt = updatedAt;
      return card;
    },

    async updateStatus(cardId, ownerPlayerId, status: CardStatus, updatedAt) {
      const card = cards.find((candidate) => candidate.id === cardId && candidate.ownerPlayerId === ownerPlayerId);

      if (!card) {
        return null;
      }

      card.status = status;
      card.updatedAt = updatedAt;

      if (status === "pending_partner_approval") {
        card.submittedAt = updatedAt;
      }

      if (status === "archived") {
        card.archivedAt = updatedAt;
      }

      return card;
    },
  };
}

describe("card service", () => {
  it("creates an incomplete blank draft that can be autosaved later", async () => {
    const repository = createCardRepository();
    const service = createCardService({ cards: repository });

    const result = await service.createBlankDraft({
      ownerPlayerId: "player-1",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.status).toBe("draft");
    expect(result.data.cardData).toEqual({});
    expect(result.data.title).toBe("Untitled card");
  });

  it("autosaves draft card data without requiring completed WBF fields", async () => {
    const saveTime = new Date("2026-09-02T12:00:00.000Z");
    const repository = createCardRepository([buildCard()]);
    const service = createCardService({
      cards: repository,
      now: () => saveTime,
    });

    const result = await service.autosaveDraft({
      cardId: "card-1",
      ownerPlayerId: "player-1",
      title: " System notes ",
      cardData: {
        openings: {
          oneClub: "2+",
        },
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.title).toBe("System notes");
    expect(result.data.cardData).toEqual({ openings: { oneClub: "2+" } });
    expect(result.data.updatedAt).toEqual(saveTime);
  });

  it("blocks autosave once a card is no longer a draft", async () => {
    const repository = createCardRepository([buildCard({ status: "active" })]);
    const service = createCardService({ cards: repository });

    const result = await service.autosaveDraft({
      cardId: "card-1",
      ownerPlayerId: "player-1",
      cardData: {
        openings: {
          oneClub: "2+",
        },
      },
    });

    expect(result).toEqual({ ok: false, error: "CARD_NOT_EDITABLE" });
  });

  it("submits a draft for partner approval", async () => {
    const submitTime = new Date("2026-09-02T13:00:00.000Z");
    const repository = createCardRepository([buildCard()]);
    const service = createCardService({
      cards: repository,
      now: () => submitTime,
    });

    const result = await service.submitForPartnerApproval("card-1", "player-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.status).toBe("pending_partner_approval");
    expect(result.data.submittedAt).toEqual(submitTime);
  });
});
