import { describe, expect, it, vi } from "vitest";

import { createApp } from "../../../backend/src/app.js";
import type { AuthService } from "../../../backend/src/auth/auth.service.js";
import type { AuthProvider } from "../../../backend/src/auth/auth.types.js";
import type { CardService } from "../../../backend/src/cards/card.service.js";
import type { PartnershipService } from "../../../backend/src/partnerships/partnership.service.js";
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

function createCardService(): CardService {
  return {
    createBlankDraft: vi.fn(),
    listMyCards: vi.fn(async () => ok([])),
    listCardsForPartnerReview: vi.fn(async () => ok([])),
    getMyCard: vi.fn(),
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
      checkedAt: new Date("2026-09-02T10:00:00.000Z"),
      confidence: "low" as const,
    })),
  };
}

function createSharingService(): SharingService {
  return {
    createShareLink: vi.fn(),
    listShareLinks: vi.fn(async () => ok([])),
    revokeShareLink: vi.fn(async () =>
      ok({
        id: "share-link-1",
        cardId: "card-1",
        expiresAt: null,
        revokedAt: new Date("2026-09-02T12:00:00.000Z"),
        createdAt: new Date("2026-09-02T10:00:00.000Z"),
      }),
    ),
    getPublicSharedCard: vi.fn(async () =>
      ok({
        card: {
          id: "card-1",
          title: "Shared card",
          status: "active" as const,
          cardData: { openings: { oneClub: "2+" } },
          updatedAt: new Date("2026-09-02T10:00:00.000Z"),
        },
        players: {
          owner: {
            displayName: "Owner",
            wbfNumber: "123456",
          },
          partner: null,
        },
        shareLink: {
          id: "share-link-1",
          expiresAt: null,
          createdAt: new Date("2026-09-02T10:00:00.000Z"),
        },
      }),
    ),
  };
}

describe("sharing routes", () => {
  it("revokes an owned share link", async () => {
    const sharing = createSharingService();
    const app = createApp({
      auth: createAuthService(),
      authProvider: createAuthProvider(),
      cards: createCardService(),
      partnerships: createPartnershipService(),
      sharing,
      templates: createTemplateService(),
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/share-links/share-link-1/revoke", {
      method: "POST",
      headers: {
        authorization: "Bearer access-token",
      },
    });

    expect(response.status).toBe(200);
    expect(sharing.revokeShareLink).toHaveBeenCalledWith("share-link-1", "player-1");
  });

  it("loads a shared card publicly by token", async () => {
    const sharing = createSharingService();
    const app = createApp({
      auth: createAuthService(),
      authProvider: createAuthProvider(),
      cards: createCardService(),
      partnerships: createPartnershipService(),
      sharing,
      templates: createTemplateService(),
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/shared/cards/raw-token");

    expect(response.status).toBe(200);
    expect(sharing.getPublicSharedCard).toHaveBeenCalledWith("raw-token");
    expect(await response.json()).toMatchObject({
      data: {
        card: {
          title: "Shared card",
        },
      },
    });
  });

  it("returns not found for invalid public tokens", async () => {
    const sharing = createSharingService();
    vi.mocked(sharing.getPublicSharedCard).mockResolvedValueOnce(err("SHARE_LINK_NOT_FOUND"));
    const app = createApp({
      auth: createAuthService(),
      authProvider: createAuthProvider(),
      cards: createCardService(),
      partnerships: createPartnershipService(),
      sharing,
      templates: createTemplateService(),
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/shared/cards/bad-token");

    expect(response.status).toBe(404);
  });
});
