import { describe, expect, it, vi } from "vitest";

import type { ActivityWriter } from "../../../backend/src/activity/index.js";
import { createCardService } from "../../../backend/src/cards/card.service.js";
import type { CardRepository } from "../../../backend/src/cards/card.repository.js";
import type { CardStatus, ConventionCard, PartnerCardReviewStatus } from "../../../backend/src/cards/card.types.js";
import type { PartnershipRepository } from "../../../backend/src/partnerships/partnership.repository.js";
import type { Partnership } from "../../../backend/src/partnerships/partnership.types.js";
import type { Player } from "../../../backend/src/players/player.types.js";
import type { CardValidationService } from "../../../backend/src/validation/index.js";

function buildCard(overrides: Partial<ConventionCard> = {}): ConventionCard {
  const now = new Date("2026-09-02T10:00:00.000Z");

  return {
    id: "card-1",
    ownerPlayerId: "player-1",
    partnershipId: null,
    sourceCardId: null,
    revisionNumber: 1,
    title: "Untitled card",
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

function buildPlayer(overrides: Partial<Player> = {}): Player {
  const now = new Date("2026-09-02T10:00:00.000Z");

  return {
    id: "player-2",
    authUserId: "auth-user-2",
    wbfNumber: "654321",
    email: "partner@example.com",
    displayName: "Partner",
    countryOrNbo: null,
    verificationStatus: "pending",
    verificationSource: null,
    verificationCheckedAt: null,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function buildPartnership(overrides: Partial<Partnership> = {}): Partnership {
  const now = new Date("2026-09-02T10:00:00.000Z");

  return {
    id: "partnership-1",
    ownerPlayerId: "player-1",
    partnerPlayerId: "player-2",
    partnerWbfNumber: "654321",
    status: "approved",
    approvedAt: now,
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
        sourceCardId: input.sourceCardId ?? null,
        revisionNumber: input.revisionNumber ?? 1,
        title: input.title,
        cardData: input.cardData,
      });

      cards.push(card);
      return card;
    },

    async createDraftRevisionFromCard(sourceCard) {
      const card = buildCard({
        id: `card-${cards.length + 1}`,
        ownerPlayerId: sourceCard.ownerPlayerId,
        partnershipId: sourceCard.partnershipId,
        sourceCardId: sourceCard.id,
        revisionNumber: sourceCard.revisionNumber + 1,
        title: sourceCard.title,
        cardData: sourceCard.cardData,
      });

      cards.push(card);
      return card;
    },

    async listByOwner(ownerPlayerId) {
      return cards.filter((card) => card.ownerPlayerId === ownerPlayerId);
    },

    async listPendingReviewForPartner(playerId, wbfNumber) {
      return cards.filter((card) => {
        const partnership = card.partnershipId
          ? buildPartnership({ id: card.partnershipId })
          : null;

        return (
          card.status === "pending_partner_approval" &&
          partnership?.status === "approved" &&
          (partnership.partnerPlayerId === playerId || partnership.partnerWbfNumber === wbfNumber)
        );
      });
    },

    async findOwnedCard(cardId, ownerPlayerId) {
      return cards.find((card) => card.id === cardId && card.ownerPlayerId === ownerPlayerId) ?? null;
    },

    async findDraftRevisionForSourceCard(sourceCardId, ownerPlayerId) {
      return cards.find(
        (card) =>
          card.sourceCardId === sourceCardId && card.ownerPlayerId === ownerPlayerId && card.status === "draft",
      ) ?? null;
    },

    async findCardForPartnerReview(cardId, playerId, wbfNumber) {
      const card = cards.find((candidate) => candidate.id === cardId);
      const partnership = card?.partnershipId ? buildPartnership({ id: card.partnershipId }) : null;

      if (
        !card ||
        partnership?.status !== "approved" ||
        (partnership.partnerPlayerId !== playerId && partnership.partnerWbfNumber !== wbfNumber)
      ) {
        return null;
      }

      return card;
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
        card.partnerReviewedByPlayerId = null;
        card.partnerReviewedAt = null;
        card.partnerRejectionReason = null;
      }

      if (status === "archived") {
        card.archivedAt = updatedAt;
      }

      if (status === "active") {
        card.activatedAt = updatedAt;
      }

      return card;
    },

    async updatePartnerReviewStatus(input: {
      cardId: string;
      reviewedByPlayerId: string;
      status: PartnerCardReviewStatus;
      reviewedAt: Date;
      rejectionReason?: string | null;
    }) {
      const card = cards.find((candidate) => candidate.id === input.cardId && candidate.status === "pending_partner_approval");

      if (!card) {
        return null;
      }

      card.status = input.status;
      card.partnerReviewedByPlayerId = input.reviewedByPlayerId;
      card.partnerReviewedAt = input.reviewedAt;
      card.partnerRejectionReason = input.status === "partner_rejected" ? input.rejectionReason ?? null : null;
      card.updatedAt = input.reviewedAt;
      return card;
    },
  };
}

function createPartnershipRepository(seed: Partnership[] = []): Pick<PartnershipRepository, "findById"> {
  return {
    async findById(partnershipId) {
      return seed.find((partnership) => partnership.id === partnershipId) ?? null;
    },
  };
}

function createValidationService(valid = true): CardValidationService {
  return {
    validateForActivation() {
      return {
        valid,
        issues: valid
          ? []
          : [
              {
                code: "CARD_DATA_SECTION_REQUIRED",
                path: "cardData",
                message: "Card data is required before activation.",
              },
            ],
      };
    },
  };
}

function createActivityWriter(): ActivityWriter {
  return {
    recordEvent: vi.fn(),
  };
}

describe("card service", () => {
  it("creates an incomplete blank draft that can be autosaved later", async () => {
    const repository = createCardRepository();
    const activity = createActivityWriter();
    const service = createCardService({ cards: repository, activity });

    const result = await service.createBlankDraft({
      ownerPlayerId: "player-1",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.status).toBe("draft");
    expect(result.data.cardData).toEqual({});
    expect(result.data.title).toBe("Untitled card");
    expect(activity.recordEvent).toHaveBeenCalledWith({
      eventType: "card.created",
      actorPlayerId: "player-1",
      entityType: "card",
      entityId: "card-1",
      cardId: "card-1",
      partnershipId: null,
      metadata: {
        title: "Untitled card",
        status: "draft",
      },
    });
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

  it("creates a draft revision from a rejected card", async () => {
    const repository = createCardRepository([
      buildCard({
        status: "partner_rejected",
        partnershipId: "partnership-1",
        title: "Rejected card",
        cardData: { openings: { oneClub: "2+" } },
        partnerReviewedByPlayerId: "player-2",
        partnerReviewedAt: new Date("2026-09-02T13:30:00.000Z"),
        partnerRejectionReason: "Please check leads.",
      }),
    ]);
    const service = createCardService({ cards: repository });

    const result = await service.createRevisionFromRejectedCard("card-1", "player-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data).toMatchObject({
      id: "card-2",
      ownerPlayerId: "player-1",
      partnershipId: "partnership-1",
      sourceCardId: "card-1",
      revisionNumber: 2,
      title: "Rejected card",
      status: "draft",
      cardData: { openings: { oneClub: "2+" } },
      partnerReviewedByPlayerId: null,
      partnerReviewedAt: null,
      partnerRejectionReason: null,
    });
  });

  it("blocks revisions for cards that were not rejected", async () => {
    const repository = createCardRepository([
      buildCard({
        status: "active",
        partnershipId: "partnership-1",
        cardData: { openings: { oneClub: "2+" } },
      }),
    ]);
    const service = createCardService({ cards: repository });

    const result = await service.createRevisionFromRejectedCard("card-1", "player-1");

    expect(result).toEqual({ ok: false, error: "CARD_NOT_REVISIONABLE" });
  });

  it("blocks creating a second open draft revision from the same rejected card", async () => {
    const repository = createCardRepository([
      buildCard({
        status: "partner_rejected",
        partnershipId: "partnership-1",
        partnerReviewedByPlayerId: "player-2",
        partnerReviewedAt: new Date("2026-09-02T13:30:00.000Z"),
      }),
      buildCard({
        id: "card-2",
        sourceCardId: "card-1",
        revisionNumber: 2,
        status: "draft",
        partnershipId: "partnership-1",
      }),
    ]);
    const service = createCardService({ cards: repository });

    const result = await service.createRevisionFromRejectedCard("card-1", "player-1");

    expect(result).toEqual({ ok: false, error: "CARD_REVISION_ALREADY_EXISTS" });
  });

  it("submits a draft for partner approval", async () => {
    const submitTime = new Date("2026-09-02T13:00:00.000Z");
    const repository = createCardRepository([buildCard()]);
    const activity = createActivityWriter();
    const service = createCardService({
      cards: repository,
      activity,
      now: () => submitTime,
    });

    const result = await service.submitForPartnerApproval("card-1", "player-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.status).toBe("pending_partner_approval");
    expect(result.data.submittedAt).toEqual(submitTime);
    expect(activity.recordEvent).toHaveBeenCalledWith({
      eventType: "card.submitted_for_approval",
      actorPlayerId: "player-1",
      entityType: "card",
      entityId: "card-1",
      cardId: "card-1",
      partnershipId: null,
    });
  });

  it("lists submitted cards waiting for partner review", async () => {
    const repository = createCardRepository([
      buildCard({
        status: "pending_partner_approval",
        partnershipId: "partnership-1",
      }),
      buildCard({
        id: "card-2",
        status: "draft",
        partnershipId: "partnership-1",
      }),
    ]);
    const service = createCardService({ cards: repository });

    const result = await service.listCardsForPartnerReview(buildPlayer());

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.map((card) => card.id)).toEqual(["card-1"]);
  });

  it("lets the partner approve a submitted card", async () => {
    const reviewTime = new Date("2026-09-02T13:30:00.000Z");
    const repository = createCardRepository([
      buildCard({
        status: "pending_partner_approval",
        partnershipId: "partnership-1",
      }),
    ]);
    const service = createCardService({
      cards: repository,
      now: () => reviewTime,
    });

    const result = await service.approveCardAsPartner("card-1", buildPlayer());

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.status).toBe("partner_approved");
    expect(result.data.partnerReviewedByPlayerId).toBe("player-2");
    expect(result.data.partnerReviewedAt).toEqual(reviewTime);
    expect(result.data.partnerRejectionReason).toBeNull();
  });

  it("lets the partner reject a submitted card with a reason", async () => {
    const reviewTime = new Date("2026-09-02T13:45:00.000Z");
    const repository = createCardRepository([
      buildCard({
        status: "pending_partner_approval",
        partnershipId: "partnership-1",
      }),
    ]);
    const service = createCardService({
      cards: repository,
      now: () => reviewTime,
    });

    const result = await service.rejectCardAsPartner("card-1", buildPlayer(), "  Please check leads. ");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.status).toBe("partner_rejected");
    expect(result.data.partnerReviewedByPlayerId).toBe("player-2");
    expect(result.data.partnerReviewedAt).toEqual(reviewTime);
    expect(result.data.partnerRejectionReason).toBe("Please check leads.");
  });

  it("blocks review once a card is no longer pending partner approval", async () => {
    const repository = createCardRepository([
      buildCard({
        status: "partner_approved",
        partnershipId: "partnership-1",
      }),
    ]);
    const service = createCardService({ cards: repository });

    const result = await service.approveCardAsPartner("card-1", buildPlayer());

    expect(result).toEqual({ ok: false, error: "CARD_NOT_PENDING_REVIEW" });
  });

  it("activates a partner-approved card when its partnership is approved", async () => {
    const activateTime = new Date("2026-09-02T14:00:00.000Z");
    const repository = createCardRepository([
      buildCard({
        status: "partner_approved",
        partnershipId: "partnership-1",
        cardData: { openings: { oneClub: "2+" } },
        partnerReviewedByPlayerId: "player-2",
        partnerReviewedAt: new Date("2026-09-02T13:30:00.000Z"),
      }),
    ]);
    const service = createCardService({
      cards: repository,
      partnerships: createPartnershipRepository([buildPartnership()]),
      validation: createValidationService(),
      now: () => activateTime,
    });

    const result = await service.activateCard("card-1", "player-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.status).toBe("active");
    expect(result.data.activatedAt).toEqual(activateTime);
  });

  it("blocks activation before partner card approval", async () => {
    const repository = createCardRepository([
      buildCard({
        status: "pending_partner_approval",
        partnershipId: "partnership-1",
        cardData: { openings: { oneClub: "2+" } },
      }),
    ]);
    const service = createCardService({
      cards: repository,
      partnerships: createPartnershipRepository([buildPartnership()]),
      validation: createValidationService(),
    });

    const result = await service.activateCard("card-1", "player-1");

    expect(result).toEqual({ ok: false, error: "CARD_NOT_APPROVED_BY_PARTNER" });
  });

  it("blocks activation before partner approval", async () => {
    const repository = createCardRepository([
      buildCard({
        status: "partner_approved",
        partnershipId: "partnership-1",
        cardData: { openings: { oneClub: "2+" } },
        partnerReviewedByPlayerId: "player-2",
        partnerReviewedAt: new Date("2026-09-02T13:30:00.000Z"),
      }),
    ]);
    const service = createCardService({
      cards: repository,
      partnerships: createPartnershipRepository([buildPartnership({ status: "pending", approvedAt: null })]),
      validation: createValidationService(),
    });

    const result = await service.activateCard("card-1", "player-1");

    expect(result).toEqual({ ok: false, error: "PARTNERSHIP_NOT_APPROVED" });
  });

  it("blocks activation when validation fails", async () => {
    const repository = createCardRepository([
      buildCard({
        status: "partner_approved",
        partnershipId: "partnership-1",
        partnerReviewedByPlayerId: "player-2",
        partnerReviewedAt: new Date("2026-09-02T13:30:00.000Z"),
      }),
    ]);
    const service = createCardService({
      cards: repository,
      partnerships: createPartnershipRepository([buildPartnership()]),
      validation: createValidationService(false),
    });

    const result = await service.activateCard("card-1", "player-1");

    expect(result).toEqual({
      ok: false,
      error: "CARD_NOT_READY_FOR_ACTIVATION",
      message: "Card data is required before activation.",
    });
  });
});
