import { describe, expect, it, vi } from "vitest";

import { createApp } from "../../../backend/src/app.js";
import type { AuthService } from "../../../backend/src/auth/auth.service.js";
import type { AuthProvider } from "../../../backend/src/auth/auth.types.js";
import type { CardService } from "../../../backend/src/cards/card.service.js";
import type { PartnershipService } from "../../../backend/src/partnerships/partnership.service.js";
import type { Partnership } from "../../../backend/src/partnerships/partnership.types.js";
import type { PlayerProfileService } from "../../../backend/src/players/playerProfile.service.js";
import type { Player } from "../../../backend/src/players/player.types.js";
import type { SharingService } from "../../../backend/src/sharing/index.js";
import { err, ok } from "../../../backend/src/shared/result.js";
import type { TemplateService } from "../../../backend/src/templates/index.js";
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

function buildPartnership(overrides: Partial<Partnership> = {}): Partnership {
  const now = new Date("2026-09-02T10:00:00.000Z");

  return {
    id: "partnership-1",
    ownerPlayerId: "player-1",
    partnerPlayerId: null,
    partnerWbfNumber: "654321",
    status: "pending",
    approvedAt: null,
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
    refreshSession: vi.fn(),
  };
}

function createCardService(): CardService {
  return {
    createBlankDraft: vi.fn(),
    listMyCards: vi.fn(async () => ok([])),
    listCardsForPartnerReview: vi.fn(async () => ok([])),
    getMyCard: vi.fn(),
    createRevisionFromRejectedCard: vi.fn(),
    autosaveDraft: vi.fn(),
    submitForPartnerApproval: vi.fn(),
    approveCardAsPartner: vi.fn(),
    rejectCardAsPartner: vi.fn(),
    activateCard: vi.fn(),
    archiveCard: vi.fn(),
    unarchiveCard: vi.fn(),
  };
}

function createPartnershipService(partnership = buildPartnership()): PartnershipService {
  return {
    createPartnership: vi.fn(async () => ok(partnership)),
    listMyPartnerships: vi.fn(async () => ok([partnership])),
    approvePartnership: vi.fn(async () => ok(buildPartnership({ ...partnership, status: "approved" }))),
    declinePartnership: vi.fn(async () => ok(buildPartnership({ ...partnership, status: "declined" }))),
    archivePartnership: vi.fn(async () => ok(buildPartnership({ ...partnership, status: "archived" }))),
  };
}

function createPlayerProfileService(): PlayerProfileService {
  return {
    getMyProfile: vi.fn(async (player: Player) => ok(player)),
    updateMyProfile: vi.fn(),
  };
}

function createTemplateService(): TemplateService {
  return {
    listTemplates: vi.fn(async () => ok([])),
    getTemplate: vi.fn(),
  };
}

function createSharingService(): SharingService {
  return {
    createShareLink: vi.fn(),
    listShareLinks: vi.fn(async () => ok([])),
    revokeShareLink: vi.fn(),
    getPublicSharedCard: vi.fn(),
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

describe("partnership routes", () => {
  it("requires authentication", async () => {
    const app = createApp({
      auth: createAuthService(),
      authProvider: createAuthProvider(),
      cards: createCardService(),
      partnerships: createPartnershipService(),
      playerProfiles: createPlayerProfileService(),
      sharing: createSharingService(),
      templates: createTemplateService(),
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/partnerships");

    expect(response.status).toBe(401);
  });

  it("creates a partnership for the signed-in player", async () => {
    const partnerships = createPartnershipService();
    const app = createApp({
      auth: createAuthService(),
      authProvider: createAuthProvider(),
      cards: createCardService(),
      partnerships,
      playerProfiles: createPlayerProfileService(),
      sharing: createSharingService(),
      templates: createTemplateService(),
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/partnerships", {
      method: "POST",
      body: JSON.stringify({ partnerWbfNumber: "654321" }),
      headers: {
        authorization: "Bearer access-token",
        "content-type": "application/json",
      },
    });

    expect(response.status).toBe(201);
    expect(partnerships.createPartnership).toHaveBeenCalledWith({
      ownerPlayerId: "player-1",
      ownerWbfNumber: "123456",
      partnerWbfNumber: "654321",
    });
  });

  it("lists partnerships for the signed-in player", async () => {
    const partnerships = createPartnershipService();
    const player = buildPlayer();
    const app = createApp({
      auth: createAuthService(player),
      authProvider: createAuthProvider(),
      cards: createCardService(),
      partnerships,
      playerProfiles: createPlayerProfileService(),
      sharing: createSharingService(),
      templates: createTemplateService(),
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/partnerships", {
      headers: {
        authorization: "Bearer access-token",
      },
    });

    expect(response.status).toBe(200);
    expect(partnerships.listMyPartnerships).toHaveBeenCalledWith(player);
  });

  it("approves a pending partnership", async () => {
    const partnerships = createPartnershipService();
    const player = buildPlayer();
    const app = createApp({
      auth: createAuthService(player),
      authProvider: createAuthProvider(),
      cards: createCardService(),
      partnerships,
      playerProfiles: createPlayerProfileService(),
      sharing: createSharingService(),
      templates: createTemplateService(),
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/partnerships/partnership-1/approve", {
      method: "POST",
      headers: {
        authorization: "Bearer access-token",
      },
    });

    expect(response.status).toBe(200);
    expect(partnerships.approvePartnership).toHaveBeenCalledWith("partnership-1", player);
  });

  it("maps self-partnership creation to a conflict", async () => {
    const partnerships = createPartnershipService();
    vi.mocked(partnerships.createPartnership).mockResolvedValueOnce(err("CANNOT_PARTNER_WITH_SELF"));
    const app = createApp({
      auth: createAuthService(),
      authProvider: createAuthProvider(),
      cards: createCardService(),
      partnerships,
      playerProfiles: createPlayerProfileService(),
      sharing: createSharingService(),
      templates: createTemplateService(),
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/partnerships", {
      method: "POST",
      body: JSON.stringify({ partnerWbfNumber: "123456" }),
      headers: {
        authorization: "Bearer access-token",
        "content-type": "application/json",
      },
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: {
        code: "CANNOT_PARTNER_WITH_SELF",
        message: "Partnership cannot be changed this way.",
      },
    });
  });
});
