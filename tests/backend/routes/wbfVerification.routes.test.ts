import { describe, expect, it, vi } from "vitest";

import { createApp } from "../../../backend/src/app.js";
import type { AuthService } from "../../../backend/src/auth/auth.service.js";
import type { AuthProvider } from "../../../backend/src/auth/auth.types.js";
import type { CardService } from "../../../backend/src/cards/card.service.js";
import type { PartnershipService } from "../../../backend/src/partnerships/partnership.service.js";
import type { PlayerProfileService } from "../../../backend/src/players/playerProfile.service.js";
import type { Player } from "../../../backend/src/players/player.types.js";
import type { SharingService } from "../../../backend/src/sharing/index.js";
import { ok } from "../../../backend/src/shared/result.js";
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

function createAuthProvider(): AuthProvider {
  return {
    registerWithEmailPassword: vi.fn(),
    signInWithEmailPassword: vi.fn(),
    refreshSession: vi.fn(),
    sendPasswordResetEmail: vi.fn(async () => ok(undefined)),
    updatePassword: vi.fn(async () => ok(undefined)),
    getUserByAccessToken: vi.fn(async () => ok({ id: "auth-user-1", email: "player@example.com" })),
    signOut: vi.fn(async () => ok(undefined)),
  };
}

function createAuthService(): AuthService {
  return {
    registerPlayerAccount: vi.fn(),
    loginWithWbfNumber: vi.fn(),
    requestPasswordReset: vi.fn(),
    changePassword: vi.fn(),
    getCurrentPlayer: vi.fn(async () => ok(buildPlayer())),
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

describe("WBF verification routes", () => {
  it("verifies a submitted WBF number", async () => {
    const wbfVerification: WbfVerificationService = {
      verifyWbfNumber: vi.fn(async (wbfNumber: string) => ({
        status: "found" as const,
        wbfNumber,
        playerName: "Test Player",
        checkedAt: new Date("2026-09-02T12:00:00.000Z"),
        confidence: "high" as const,
      })),
    };
    const app = createApp({
      auth: createAuthService(),
      authProvider: createAuthProvider(),
      cards: createCardService(),
      partnerships: createPartnershipService(),
      playerProfiles: createPlayerProfileService(),
      sharing: createSharingService(),
      templates: createTemplateService(),
      wbfVerification,
    });

    const response = await app.request("/wbf-verification/verify", {
      method: "POST",
      body: JSON.stringify({ wbfNumber: "123456" }),
      headers: {
        "content-type": "application/json",
      },
    });

    expect(response.status).toBe(200);
    expect(wbfVerification.verifyWbfNumber).toHaveBeenCalledWith("123456");
    expect(await response.json()).toMatchObject({
      data: {
        status: "found",
        playerName: "Test Player",
      },
    });
  });
});
