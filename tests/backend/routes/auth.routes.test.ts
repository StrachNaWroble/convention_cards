import { describe, expect, it, vi } from "vitest";

import { createApp } from "../../../backend/src/app.js";
import type { AuthService } from "../../../backend/src/auth/auth.service.js";
import type { AuthProvider } from "../../../backend/src/auth/auth.types.js";
import type { CardService } from "../../../backend/src/cards/card.service.js";
import type { PartnershipService } from "../../../backend/src/partnerships/partnership.service.js";
import type { PlayerProfileService } from "../../../backend/src/players/playerProfile.service.js";
import type { Player } from "../../../backend/src/players/player.types.js";
import { createAppRateLimiters, createInMemoryRateLimitStore } from "../../../backend/src/security/index.js";
import type { SharingService } from "../../../backend/src/sharing/index.js";
import { err, ok } from "../../../backend/src/shared/result.js";
import type { TemplateService } from "../../../backend/src/templates/index.js";
import type { WbfVerificationService } from "../../../backend/src/wbf-verification/index.js";

function buildPlayer(overrides: Partial<Player> = {}): Player {
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
    ...overrides,
  };
}

function createAuthProvider(): AuthProvider {
  return {
    registerWithEmailPassword: vi.fn(),
    signInWithEmailPassword: vi.fn(),
    refreshSession: vi.fn(async () =>
      ok({
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
        expiresAt: 1_788_349_200,
      }),
    ),
    sendPasswordResetEmail: vi.fn(async () => ok(undefined)),
    updatePassword: vi.fn(async () => ok(undefined)),
    getUserByAccessToken: vi.fn(async () => ok({ id: "auth-user-1", email: "player@example.com" })),
    signOut: vi.fn(async () => ok(undefined)),
  };
}

function createAuthService(player = buildPlayer()): AuthService {
  return {
    registerPlayerAccount: vi.fn(async () =>
      ok({
        player,
        authUser: {
          id: player.authUserId,
          email: player.email,
        },
      }),
    ),
    loginWithWbfNumber: vi.fn(async () =>
      ok({
        player,
        session: {
          accessToken: "access-token",
          refreshToken: "refresh-token",
          expiresAt: 1_788_345_600,
        },
      }),
    ),
    requestPasswordReset: vi.fn(async () => ok({ resetEmailQueued: true as const })),
    changePassword: vi.fn(async () => ok({ passwordChanged: true as const })),
    getCurrentPlayer: vi.fn(async () => ok(player)),
  };
}

function createCardService(): CardService {
  return {
    createBlankDraft: vi.fn(),
    listMyCards: vi.fn(async () => ok([])),
    listCardsForPartnerReview: vi.fn(async () => ok([])),
    getMyCard: vi.fn(),
    validateForActivation: vi.fn(async () => ok({ valid: true, issues: [] })),
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

describe("auth routes", () => {
  it("registers a player account", async () => {
    const auth = createAuthService();
    const app = createApp({
      auth,
      authProvider: createAuthProvider(),
      cards: createCardService(),
      partnerships: createPartnershipService(),
      playerProfiles: createPlayerProfileService(),
      sharing: createSharingService(),
      templates: createTemplateService(),
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        wbfNumber: "123456",
        email: "player@example.com",
        password: "safe-password",
      }),
      headers: {
        "content-type": "application/json",
      },
    });

    expect(response.status).toBe(201);
    expect(auth.registerPlayerAccount).toHaveBeenCalledWith({
      wbfNumber: "123456",
      email: "player@example.com",
      password: "safe-password",
    });
  });

  it("returns a conflict when the WBF number is already registered", async () => {
    const auth = createAuthService();
    vi.mocked(auth.registerPlayerAccount).mockResolvedValueOnce(err("WBF_NUMBER_ALREADY_REGISTERED"));
    const app = createApp({
      auth,
      authProvider: createAuthProvider(),
      cards: createCardService(),
      partnerships: createPartnershipService(),
      playerProfiles: createPlayerProfileService(),
      sharing: createSharingService(),
      templates: createTemplateService(),
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        wbfNumber: "123456",
        email: "player@example.com",
        password: "safe-password",
      }),
      headers: {
        "content-type": "application/json",
      },
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: {
        code: "WBF_NUMBER_ALREADY_REGISTERED",
        message: "This WBF number is already registered.",
      },
    });
  });

  it("logs in using WBF number and password", async () => {
    const auth = createAuthService();
    const app = createApp({
      auth,
      authProvider: createAuthProvider(),
      cards: createCardService(),
      partnerships: createPartnershipService(),
      playerProfiles: createPlayerProfileService(),
      sharing: createSharingService(),
      templates: createTemplateService(),
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        wbfNumber: "123456",
        password: "safe-password",
      }),
      headers: {
        "content-type": "application/json",
      },
    });

    expect(response.status).toBe(200);
    expect(auth.loginWithWbfNumber).toHaveBeenCalledWith({
      wbfNumber: "123456",
      password: "safe-password",
    });
    expect(await response.json()).toMatchObject({
      data: {
        session: {
          accessToken: "access-token",
        },
      },
    });
  });

  it("rate limits repeated auth requests from the same client", async () => {
    const auth = createAuthService();
    const app = createApp({
      auth,
      authProvider: createAuthProvider(),
      cards: createCardService(),
      partnerships: createPartnershipService(),
      playerProfiles: createPlayerProfileService(),
      rateLimits: createAppRateLimiters(
        {
          enabled: true,
          windowMs: 60_000,
          authMaxRequests: 1,
          passwordResetMaxRequests: 5,
          wbfVerificationMaxRequests: 5,
        },
        createInMemoryRateLimitStore(),
      ),
      sharing: createSharingService(),
      templates: createTemplateService(),
      wbfVerification: createWbfVerificationService(),
    });

    const request = {
      method: "POST",
      body: JSON.stringify({
        wbfNumber: "123456",
        password: "safe-password",
      }),
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.10",
      },
    };

    const firstResponse = await app.request("/auth/login", request);
    const secondResponse = await app.request("/auth/login", request);

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(429);
    expect(secondResponse.headers.get("Retry-After")).toBe("60");
    expect(await secondResponse.json()).toEqual({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests. Please try again later.",
      },
    });
    expect(auth.loginWithWbfNumber).toHaveBeenCalledTimes(1);
  });

  it("refreshes a Supabase session", async () => {
    const authProvider = createAuthProvider();
    const app = createApp({
      auth: createAuthService(),
      authProvider,
      cards: createCardService(),
      partnerships: createPartnershipService(),
      playerProfiles: createPlayerProfileService(),
      sharing: createSharingService(),
      templates: createTemplateService(),
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken: "refresh-token" }),
      headers: {
        "content-type": "application/json",
      },
    });

    expect(response.status).toBe(200);
    expect(authProvider.refreshSession).toHaveBeenCalledWith("refresh-token");
    expect(await response.json()).toEqual({
      data: {
        session: {
          accessToken: "new-access-token",
          refreshToken: "new-refresh-token",
          expiresAt: 1_788_349_200,
        },
      },
    });
  });

  it("rejects invalid refresh tokens", async () => {
    const authProvider = createAuthProvider();
    vi.mocked(authProvider.refreshSession).mockResolvedValueOnce(err("AUTH_REFRESH_FAILED"));
    const app = createApp({
      auth: createAuthService(),
      authProvider,
      cards: createCardService(),
      partnerships: createPartnershipService(),
      playerProfiles: createPlayerProfileService(),
      sharing: createSharingService(),
      templates: createTemplateService(),
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken: "bad-refresh-token" }),
      headers: {
        "content-type": "application/json",
      },
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: {
        code: "AUTH_REFRESH_FAILED",
        message: "Invalid or expired refresh token.",
      },
    });
  });

  it("requests a password reset using a WBF number", async () => {
    const auth = createAuthService();
    const app = createApp({
      auth,
      authProvider: createAuthProvider(),
      cards: createCardService(),
      partnerships: createPartnershipService(),
      playerProfiles: createPlayerProfileService(),
      sharing: createSharingService(),
      templates: createTemplateService(),
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/auth/password-reset", {
      method: "POST",
      body: JSON.stringify({ wbfNumber: "123456" }),
      headers: {
        "content-type": "application/json",
      },
    });

    expect(response.status).toBe(200);
    expect(auth.requestPasswordReset).toHaveBeenCalledWith({ wbfNumber: "123456" });
    expect(await response.json()).toEqual({
      data: {
        resetEmailQueued: true,
      },
    });
  });

  it("changes the current player's password", async () => {
    const auth = createAuthService();
    const app = createApp({
      auth,
      authProvider: createAuthProvider(),
      cards: createCardService(),
      partnerships: createPartnershipService(),
      playerProfiles: createPlayerProfileService(),
      sharing: createSharingService(),
      templates: createTemplateService(),
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/auth/password", {
      method: "PATCH",
      body: JSON.stringify({
        currentPassword: "safe-password",
        newPassword: "new-safe-password",
      }),
      headers: {
        authorization: "Bearer access-token",
        "content-type": "application/json",
      },
    });

    expect(response.status).toBe(200);
    expect(auth.changePassword).toHaveBeenCalledWith({
      playerId: "player-1",
      authUserId: "auth-user-1",
      email: "player@example.com",
      currentPassword: "safe-password",
      newPassword: "new-safe-password",
    });
    expect(await response.json()).toEqual({
      data: {
        passwordChanged: true,
      },
    });
  });

  it("rejects password changes when the current password is wrong", async () => {
    const auth = createAuthService();
    vi.mocked(auth.changePassword).mockResolvedValueOnce(err("INVALID_CREDENTIALS"));
    const app = createApp({
      auth,
      authProvider: createAuthProvider(),
      cards: createCardService(),
      partnerships: createPartnershipService(),
      playerProfiles: createPlayerProfileService(),
      sharing: createSharingService(),
      templates: createTemplateService(),
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/auth/password", {
      method: "PATCH",
      body: JSON.stringify({
        currentPassword: "wrong-password",
        newPassword: "new-safe-password",
      }),
      headers: {
        authorization: "Bearer access-token",
        "content-type": "application/json",
      },
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Current password is incorrect.",
      },
    });
  });

  it("maps strict WBF verification failures during registration", async () => {
    const auth = createAuthService();
    vi.mocked(auth.registerPlayerAccount).mockResolvedValueOnce(err("WBF_VERIFICATION_UNAVAILABLE"));
    const app = createApp({
      auth,
      authProvider: createAuthProvider(),
      cards: createCardService(),
      partnerships: createPartnershipService(),
      playerProfiles: createPlayerProfileService(),
      sharing: createSharingService(),
      templates: createTemplateService(),
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        wbfNumber: "123456",
        email: "player@example.com",
        password: "safe-password",
      }),
      headers: {
        "content-type": "application/json",
      },
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: {
        code: "WBF_VERIFICATION_UNAVAILABLE",
        message: "WBF verification is temporarily unavailable.",
      },
    });
  });

  it("loads the current player from a bearer token", async () => {
    const authProvider = createAuthProvider();
    const auth = createAuthService();
    const app = createApp({
      auth,
      authProvider,
      cards: createCardService(),
      partnerships: createPartnershipService(),
      playerProfiles: createPlayerProfileService(),
      sharing: createSharingService(),
      templates: createTemplateService(),
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/auth/me", {
      headers: {
        authorization: "Bearer access-token",
      },
    });

    expect(response.status).toBe(200);
    expect(authProvider.getUserByAccessToken).toHaveBeenCalledWith("access-token");
    expect(auth.getCurrentPlayer).toHaveBeenCalledWith("auth-user-1");
  });
});
