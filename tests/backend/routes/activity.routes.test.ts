import { describe, expect, it, vi } from "vitest";

import type { ActivityEvent, ActivityService } from "../../../backend/src/activity/index.js";
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
  const now = new Date("2026-09-03T10:00:00.000Z");

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

function buildActivityEvent(): ActivityEvent {
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
  };
}

function createActivityService(): ActivityService {
  return {
    recordEvent: vi.fn(),
    listMyEvents: vi.fn(async () => ok([buildActivityEvent()])),
    listOwnedCardEvents: vi.fn(async () => ok([buildActivityEvent()])),
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

function createAuthService(player = buildPlayer()): AuthService {
  return {
    registerPlayerAccount: vi.fn(),
    loginWithWbfNumber: vi.fn(),
    requestPasswordReset: vi.fn(),
    changePassword: vi.fn(),
    getCurrentPlayer: vi.fn(async () => ok(player)),
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

function createSharingService(): SharingService {
  return {
    createShareLink: vi.fn(),
    listShareLinks: vi.fn(async () => ok([])),
    revokeShareLink: vi.fn(),
    getPublicSharedCard: vi.fn(),
  };
}

function createTemplateService(): TemplateService {
  return {
    listTemplates: vi.fn(async () => ok([])),
    getTemplate: vi.fn(),
  };
}

function createWbfVerificationService(): WbfVerificationService {
  return {
    verifyWbfNumber: vi.fn(async (wbfNumber: string) => ({
      status: "unavailable" as const,
      wbfNumber,
      checkedAt: new Date("2026-09-03T10:00:00.000Z"),
      confidence: "low" as const,
    })),
  };
}

function createTestApp(activity = createActivityService()) {
  return {
    activity,
    app: createApp({
      activity,
      auth: createAuthService(),
      authProvider: createAuthProvider(),
      cards: createCardService(),
      partnerships: createPartnershipService(),
      playerProfiles: createPlayerProfileService(),
      sharing: createSharingService(),
      templates: createTemplateService(),
      wbfVerification: createWbfVerificationService(),
    }),
  };
}

describe("activity routes", () => {
  it("lists the signed-in player's activity", async () => {
    const { activity, app } = createTestApp();

    const response = await app.request("/activity?limit=10", {
      headers: {
        authorization: "Bearer access-token",
      },
    });

    expect(response.status).toBe(200);
    expect(activity.listMyEvents).toHaveBeenCalledWith("player-1", 10);
    expect(await response.json()).toMatchObject({
      data: {
        events: [
          {
            id: "event-1",
            eventType: "card.created",
            actorPlayerId: "player-1",
          },
        ],
      },
    });
  });

  it("requires authentication for activity", async () => {
    const { app } = createTestApp();

    const response = await app.request("/activity");

    expect(response.status).toBe(401);
  });

  it("lists history for an owned card", async () => {
    const { activity, app } = createTestApp();

    const response = await app.request("/cards/card-1/history", {
      headers: {
        authorization: "Bearer access-token",
      },
    });

    expect(response.status).toBe(200);
    expect(activity.listOwnedCardEvents).toHaveBeenCalledWith("card-1", "player-1");
    expect(await response.json()).toMatchObject({
      data: {
        events: [
          {
            id: "event-1",
            cardId: "card-1",
          },
        ],
      },
    });
  });
});
