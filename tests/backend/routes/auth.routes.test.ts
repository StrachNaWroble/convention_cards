import { describe, expect, it, vi } from "vitest";

import { createApp } from "../../../backend/src/app.js";
import type { AuthService } from "../../../backend/src/auth/auth.service.js";
import type { AuthProvider } from "../../../backend/src/auth/auth.types.js";
import type { CardService } from "../../../backend/src/cards/card.service.js";
import type { PartnershipService } from "../../../backend/src/partnerships/partnership.service.js";
import type { Player } from "../../../backend/src/players/player.types.js";
import { err, ok } from "../../../backend/src/shared/result.js";

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
    getCurrentPlayer: vi.fn(async () => ok(player)),
  };
}

function createCardService(): CardService {
  return {
    createBlankDraft: vi.fn(),
    listMyCards: vi.fn(async () => ok([])),
    getMyCard: vi.fn(),
    autosaveDraft: vi.fn(),
    submitForPartnerApproval: vi.fn(),
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

describe("auth routes", () => {
  it("registers a player account", async () => {
    const auth = createAuthService();
    const app = createApp({
      auth,
      authProvider: createAuthProvider(),
      cards: createCardService(),
      partnerships: createPartnershipService(),
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

  it("loads the current player from a bearer token", async () => {
    const authProvider = createAuthProvider();
    const auth = createAuthService();
    const app = createApp({
      auth,
      authProvider,
      cards: createCardService(),
      partnerships: createPartnershipService(),
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
