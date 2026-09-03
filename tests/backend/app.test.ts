import { describe, expect, it, vi } from "vitest";

import { createApp } from "../../backend/src/app.js";
import type { AuthService } from "../../backend/src/auth/index.js";
import type { AuthProvider } from "../../backend/src/auth/auth.types.js";
import type { CardService } from "../../backend/src/cards/index.js";
import type { PartnershipService } from "../../backend/src/partnerships/index.js";
import type { PlayerProfileService } from "../../backend/src/players/playerProfile.service.js";
import type { Player } from "../../backend/src/players/player.types.js";
import type { SharingService } from "../../backend/src/sharing/index.js";
import { ok } from "../../backend/src/shared/result.js";
import type { TemplateService } from "../../backend/src/templates/index.js";
import type { WbfVerificationService } from "../../backend/src/wbf-verification/index.js";

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

function createTestApp() {
  return createApp({
    auth: createAuthService(),
    authProvider: createAuthProvider(),
    cards: createCardService(),
    partnerships: createPartnershipService(),
    playerProfiles: createPlayerProfileService(),
    sharing: createSharingService(),
    templates: createTemplateService(),
    wbfVerification: createWbfVerificationService(),
  });
}

describe("app CORS", () => {
  it("allows all origins by default for local development", async () => {
    const app = createTestApp();

    const response = await app.request("/health", {
      headers: {
        origin: "https://preview.example.com",
      },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("allows configured origins", async () => {
    const app = createApp(
      {
        auth: createAuthService(),
        authProvider: createAuthProvider(),
        cards: createCardService(),
        partnerships: createPartnershipService(),
        playerProfiles: createPlayerProfileService(),
        sharing: createSharingService(),
        templates: createTemplateService(),
        wbfVerification: createWbfVerificationService(),
      },
      {
        cors: {
          allowedOrigins: ["https://app.example.com"],
          allowCredentials: true,
          maxAgeSeconds: 300,
        },
      },
    );

    const response = await app.request("/health", {
      headers: {
        origin: "https://app.example.com",
      },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://app.example.com");
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBe("true");
    expect(response.headers.get("Vary")).toContain("Origin");
  });

  it("does not expose responses to unconfigured origins", async () => {
    const app = createApp(
      {
        auth: createAuthService(),
        authProvider: createAuthProvider(),
        cards: createCardService(),
        partnerships: createPartnershipService(),
        playerProfiles: createPlayerProfileService(),
        sharing: createSharingService(),
        templates: createTemplateService(),
        wbfVerification: createWbfVerificationService(),
      },
      {
        cors: {
          allowedOrigins: ["https://app.example.com"],
          allowCredentials: false,
          maxAgeSeconds: 300,
        },
      },
    );

    const response = await app.request("/health", {
      headers: {
        origin: "https://other.example.com",
      },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("responds to allowed preflight requests", async () => {
    const app = createApp(
      {
        auth: createAuthService(),
        authProvider: createAuthProvider(),
        cards: createCardService(),
        partnerships: createPartnershipService(),
        playerProfiles: createPlayerProfileService(),
        sharing: createSharingService(),
        templates: createTemplateService(),
        wbfVerification: createWbfVerificationService(),
      },
      {
        cors: {
          allowedOrigins: ["https://app.example.com"],
          allowCredentials: false,
          maxAgeSeconds: 300,
        },
      },
    );

    const response = await app.request("/auth/login", {
      method: "OPTIONS",
      headers: {
        origin: "https://app.example.com",
        "access-control-request-method": "POST",
        "access-control-request-headers": "authorization,content-type",
      },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://app.example.com");
    expect(response.headers.get("Access-Control-Allow-Headers")).toBe("Authorization,Content-Type");
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("POST");
    expect(response.headers.get("Access-Control-Max-Age")).toBe("300");
  });
});
