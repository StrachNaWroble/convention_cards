import { describe, expect, it, vi } from "vitest";

import { createApp } from "../../../backend/src/app.js";
import type { AuthService } from "../../../backend/src/auth/auth.service.js";
import type { AuthProvider } from "../../../backend/src/auth/auth.types.js";
import type { CardService } from "../../../backend/src/cards/card.service.js";
import type { ConventionCard } from "../../../backend/src/cards/card.types.js";
import type { PartnershipService } from "../../../backend/src/partnerships/partnership.service.js";
import type { Player } from "../../../backend/src/players/player.types.js";
import { err, ok } from "../../../backend/src/shared/result.js";
import type { WbfVerificationService } from "../../../backend/src/wbf-verification/index.js";

function buildPlayer(): Player {
  const now = new Date("2026-09-02T10:00:00.000Z");

  return {
    id: "player-1",
    authUserId: "auth-user-1",
    wbfNumber: "123456",
    email: "player@example.com",
    displayName: "Test Player",
    countryOrNbo: null,
    verificationStatus: "pending",
    verificationSource: null,
    verificationCheckedAt: null,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

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

function createAuthProvider(): AuthProvider {
  return {
    registerWithEmailPassword: vi.fn(),
    signInWithEmailPassword: vi.fn(),
    getUserByAccessToken: vi.fn(async () => ok({ id: "auth-user-1", email: "player@example.com" })),
    signOut: vi.fn(async () => ok(undefined)),
  };
}

function createAuthService(player = buildPlayer()): AuthService {
  return {
    registerPlayerAccount: vi.fn(),
    loginWithWbfNumber: vi.fn(),
    getCurrentPlayer: vi.fn(async () => ok(player)),
  };
}

function createCardService(card = buildCard()): CardService {
  return {
    createBlankDraft: vi.fn(async () => ok(card)),
    listMyCards: vi.fn(async () => ok([card])),
    getMyCard: vi.fn(async () => ok(card)),
    autosaveDraft: vi.fn(async () => ok(card)),
    submitForPartnerApproval: vi.fn(async () => ok(buildCard({ ...card, status: "pending_partner_approval" }))),
    activateCard: vi.fn(async () => ok(buildCard({ ...card, status: "active" }))),
    archiveCard: vi.fn(async () => ok(buildCard({ ...card, status: "archived" }))),
  };
}

function createPartnershipService(): PartnershipService {
  return {
    createPartnership: vi.fn(),
    listMyPartnerships: vi.fn(async () => ok([])),
    approvePartnership: vi.fn(),
    declinePartnership: vi.fn(),
    archivePartnership: vi.fn(),
  };
}

function createWbfVerificationService(): WbfVerificationService {
  return {
    verifyWbfNumber: vi.fn(async (wbfNumber: string) => ({
      status: "unavailable" as const,
      wbfNumber,
      checkedAt: new Date("2026-09-02T10:00:00.000Z"),
      confidence: "low" as const,
    })),
  };
}

describe("card routes", () => {
  it("requires authentication", async () => {
    const app = createApp({
      auth: createAuthService(),
      authProvider: createAuthProvider(),
      cards: createCardService(),
      partnerships: createPartnershipService(),
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/cards");

    expect(response.status).toBe(401);
  });

  it("lists the signed-in player's cards", async () => {
    const cards = createCardService();
    const app = createApp({
      auth: createAuthService(),
      authProvider: createAuthProvider(),
      cards,
      partnerships: createPartnershipService(),
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/cards", {
      headers: {
        authorization: "Bearer access-token",
      },
    });

    expect(response.status).toBe(200);
    expect(cards.listMyCards).toHaveBeenCalledWith("player-1");
  });

  it("creates a blank draft for the signed-in player", async () => {
    const cards = createCardService();
    const app = createApp({
      auth: createAuthService(),
      authProvider: createAuthProvider(),
      cards,
      partnerships: createPartnershipService(),
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/cards", {
      method: "POST",
      body: JSON.stringify({
        title: "2/1 with Alex",
        cardData: {
          openings: {
            oneClub: "2+",
          },
        },
      }),
      headers: {
        authorization: "Bearer access-token",
        "content-type": "application/json",
      },
    });

    expect(response.status).toBe(201);
    expect(cards.createBlankDraft).toHaveBeenCalledWith({
      ownerPlayerId: "player-1",
      partnershipId: undefined,
      title: "2/1 with Alex",
      cardData: {
        openings: {
          oneClub: "2+",
        },
      },
    });
  });

  it("maps non-editable draft saves to a conflict response", async () => {
    const cards = createCardService();
    vi.mocked(cards.autosaveDraft).mockResolvedValueOnce(err("CARD_NOT_EDITABLE"));
    const app = createApp({
      auth: createAuthService(),
      authProvider: createAuthProvider(),
      cards,
      partnerships: createPartnershipService(),
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/cards/card-1", {
      method: "PATCH",
      body: JSON.stringify({
        title: "Updated title",
      }),
      headers: {
        authorization: "Bearer access-token",
        "content-type": "application/json",
      },
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: {
        code: "CARD_NOT_EDITABLE",
        message: "This card cannot be edited in its current status.",
      },
    });
  });

  it("activates a submitted and approved card", async () => {
    const cards = createCardService();
    const app = createApp({
      auth: createAuthService(),
      authProvider: createAuthProvider(),
      cards,
      partnerships: createPartnershipService(),
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/cards/card-1/activate", {
      method: "POST",
      headers: {
        authorization: "Bearer access-token",
      },
    });

    expect(response.status).toBe(200);
    expect(cards.activateCard).toHaveBeenCalledWith("card-1", "player-1");
  });
});
