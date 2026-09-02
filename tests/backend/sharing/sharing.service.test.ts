import { describe, expect, it } from "vitest";

import type { CardRepository } from "../../../backend/src/cards/card.repository.js";
import type { CardStatus, ConventionCard } from "../../../backend/src/cards/card.types.js";
import type { PartnershipRepository } from "../../../backend/src/partnerships/index.js";
import type { Partnership } from "../../../backend/src/partnerships/partnership.types.js";
import { createSharingService, hashShareToken } from "../../../backend/src/sharing/index.js";
import type { CreateShareLinkInput, PublicSharedCard, ShareLink, SharingRepository } from "../../../backend/src/sharing/index.js";

function buildCard(overrides: Partial<ConventionCard> = {}): ConventionCard {
  const now = new Date("2026-09-02T10:00:00.000Z");

  return {
    id: "card-1",
    ownerPlayerId: "player-1",
    partnershipId: "partnership-1",
    title: "Active card",
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

function buildShareLink(overrides: Partial<ShareLink> = {}): ShareLink {
  return {
    id: "share-link-1",
    cardId: "card-1",
    tokenHash: hashShareToken("raw-token"),
    expiresAt: null,
    revokedAt: null,
    createdAt: new Date("2026-09-02T10:00:00.000Z"),
    ...overrides,
  };
}

function createCardRepository(seed: ConventionCard[] = []): CardRepository {
  return {
    async createDraft() {
      throw new Error("Not used in sharing tests.");
    },
    async listByOwner() {
      return [];
    },
    async listPendingReviewForPartner() {
      return [];
    },
    async findOwnedCard(cardId, ownerPlayerId) {
      return seed.find((card) => card.id === cardId && card.ownerPlayerId === ownerPlayerId) ?? null;
    },
    async findCardForPartnerReview() {
      return null;
    },
    async updateDraft() {
      return null;
    },
    async updateStatus(_cardId: string, _ownerPlayerId: string, status: CardStatus) {
      return seed.find((card) => card.status === status) ?? null;
    },
    async updatePartnerReviewStatus() {
      return null;
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

function createSharingRepository(seed: ShareLink[] = []): SharingRepository & { createdInputs: CreateShareLinkInput[] } {
  const links = [...seed];
  const createdInputs: CreateShareLinkInput[] = [];

  return {
    createdInputs,
    async create(input) {
      createdInputs.push(input);
      const link = buildShareLink({
        id: `share-link-${links.length + 1}`,
        cardId: input.cardId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt ?? null,
      });
      links.push(link);
      return link;
    },
    async listForCard(cardId) {
      return links.filter((link) => link.cardId === cardId);
    },
    async findByIdForOwnedCard(shareLinkId) {
      return links.find((link) => link.id === shareLinkId) ?? null;
    },
    async revoke(shareLinkId, revokedAt) {
      const link = links.find((candidate) => candidate.id === shareLinkId);
      if (!link) return null;
      link.revokedAt = revokedAt;
      return link;
    },
    async findPublicSharedCardByTokenHash(tokenHash) {
      const link = links.find((candidate) => candidate.tokenHash === tokenHash && !candidate.revokedAt);
      if (!link) return null;

      return {
        card: {
          id: "card-1",
          title: "Active card",
          status: "active",
          cardData: { openings: { oneClub: "2+" } },
          updatedAt: new Date("2026-09-02T10:00:00.000Z"),
        },
        players: {
          owner: {
            displayName: "Owner",
            wbfNumber: "123456",
          },
          partner: {
            displayName: "Partner",
            wbfNumber: "654321",
          },
        },
        shareLink: {
          id: link.id,
          expiresAt: link.expiresAt,
          createdAt: link.createdAt,
        },
      } satisfies PublicSharedCard;
    },
  };
}

describe("sharing service", () => {
  it("creates a share link for an active card with an approved partnership", async () => {
    const sharing = createSharingRepository();
    const service = createSharingService({
      cards: createCardRepository([buildCard()]),
      partnerships: createPartnershipRepository([buildPartnership()]),
      sharing,
      generateToken: () => "raw-token",
    });

    const result = await service.createShareLink({
      cardId: "card-1",
      ownerPlayerId: "player-1",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.token).toBe("raw-token");
    expect(result.data.link).not.toHaveProperty("tokenHash");
    expect(sharing.createdInputs[0].tokenHash).toBe(hashShareToken("raw-token"));
    expect(sharing.createdInputs[0].tokenHash).not.toBe("raw-token");
  });

  it("blocks sharing a draft card", async () => {
    const service = createSharingService({
      cards: createCardRepository([buildCard({ status: "draft" })]),
      partnerships: createPartnershipRepository([buildPartnership()]),
      sharing: createSharingRepository(),
    });

    const result = await service.createShareLink({
      cardId: "card-1",
      ownerPlayerId: "player-1",
    });

    expect(result).toEqual({ ok: false, error: "CARD_NOT_SHAREABLE" });
  });

  it("blocks sharing before partnership approval", async () => {
    const service = createSharingService({
      cards: createCardRepository([buildCard()]),
      partnerships: createPartnershipRepository([buildPartnership({ status: "pending", approvedAt: null })]),
      sharing: createSharingRepository(),
    });

    const result = await service.createShareLink({
      cardId: "card-1",
      ownerPlayerId: "player-1",
    });

    expect(result).toEqual({ ok: false, error: "PARTNERSHIP_NOT_APPROVED" });
  });

  it("revokes a share link owned by the player", async () => {
    const revokedAt = new Date("2026-09-02T12:00:00.000Z");
    const service = createSharingService({
      cards: createCardRepository([buildCard()]),
      partnerships: createPartnershipRepository([buildPartnership()]),
      sharing: createSharingRepository([buildShareLink()]),
      now: () => revokedAt,
    });

    const result = await service.revokeShareLink("share-link-1", "player-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.revokedAt).toEqual(revokedAt);
    expect(result.data).not.toHaveProperty("tokenHash");
  });

  it("loads a public shared card by raw token", async () => {
    const service = createSharingService({
      cards: createCardRepository([buildCard()]),
      partnerships: createPartnershipRepository([buildPartnership()]),
      sharing: createSharingRepository([buildShareLink()]),
    });

    const result = await service.getPublicSharedCard("raw-token");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.card.title).toBe("Active card");
    expect(result.data.players.owner.wbfNumber).toBe("123456");
  });
});
