import { describe, expect, it, vi } from "vitest";

import { createAuthService } from "../../../backend/src/auth/auth.service.js";
import type { AuthProvider } from "../../../backend/src/auth/auth.types.js";
import type { PlayerRepository } from "../../../backend/src/players/player.repository.js";
import type { CreatePlayerInput, Player } from "../../../backend/src/players/player.types.js";
import { ok } from "../../../backend/src/shared/result.js";
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

function createPlayerRepository(seed: Player[] = []): PlayerRepository {
  const players = [...seed];

  return {
    async findByWbfNumber(wbfNumber) {
      return players.find((player) => player.wbfNumber === wbfNumber) ?? null;
    },

    async findByEmail(email) {
      return players.find((player) => player.email === email) ?? null;
    },

    async findByAuthUserId(authUserId) {
      return players.find((player) => player.authUserId === authUserId) ?? null;
    },

    async create(input: CreatePlayerInput) {
      const player = buildPlayer({
        id: `player-${players.length + 1}`,
        authUserId: input.authUserId,
        wbfNumber: input.wbfNumber,
        email: input.email,
        displayName: input.displayName ?? null,
        countryOrNbo: input.countryOrNbo ?? null,
        verificationStatus: input.verificationStatus ?? "pending",
      });

      players.push(player);
      return player;
    },

    async updateProfile(playerId, input, updatedAt) {
      const player = players.find((candidate) => candidate.id === playerId);
      if (!player) return null;
      if (input.displayName !== undefined) player.displayName = input.displayName;
      if (input.countryOrNbo !== undefined) player.countryOrNbo = input.countryOrNbo;
      player.updatedAt = updatedAt;
      return player;
    },

    async markLogin(authUserId, loggedInAt) {
      const player = players.find((candidate) => candidate.authUserId === authUserId);
      if (player) {
        player.lastLoginAt = loggedInAt;
      }
    },
  };
}

function createAuthProvider(): AuthProvider {
  return {
    registerWithEmailPassword: vi.fn(async (email: string) => ok({ id: "auth-user-new", email })),
    signInWithEmailPassword: vi.fn(async () =>
      ok({
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expiresAt: 1_788_345_600,
      }),
    ),
    refreshSession: vi.fn(async () =>
      ok({
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
        expiresAt: 1_788_349_200,
      }),
    ),
    getUserByAccessToken: vi.fn(async () => ok({ id: "auth-user-1", email: "player@example.com" })),
    signOut: vi.fn(async () => ok(undefined)),
  };
}

function createWbfVerificationService(status: "found" | "not_found" | "unavailable" = "unavailable"): WbfVerificationService {
  return {
    async verifyWbfNumber(wbfNumber) {
      return {
        status,
        wbfNumber,
        playerName: status === "found" ? "Verified Player" : undefined,
        countryOrNbo: status === "found" ? "POL" : undefined,
        sourceUrl: "https://www.worldbridge.org/person/?qryid=123456",
        checkedAt: new Date("2026-09-02T12:00:00.000Z"),
        confidence: status === "found" ? "high" : "low",
      };
    },
  };
}

describe("auth service", () => {
  it("registers a player with normalized WBF number and email", async () => {
    const repository = createPlayerRepository();
    const authProvider = createAuthProvider();
    const service = createAuthService({ players: repository, authProvider });

    const result = await service.registerPlayerAccount({
      wbfNumber: " 123 456 ",
      email: "PLAYER@EXAMPLE.COM ",
      password: "safe-password",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.player.wbfNumber).toBe("123456");
    expect(result.data.player.email).toBe("player@example.com");
    expect(authProvider.registerWithEmailPassword).toHaveBeenCalledWith("player@example.com", "safe-password");
  });

  it("stores verified WBF lookup details when registration finds a player", async () => {
    const repository = createPlayerRepository();
    const authProvider = createAuthProvider();
    const service = createAuthService({
      players: repository,
      authProvider,
      wbfVerification: createWbfVerificationService("found"),
    });

    const result = await service.registerPlayerAccount({
      wbfNumber: "123456",
      email: "player@example.com",
      password: "safe-password",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.player.displayName).toBe("Verified Player");
    expect(result.data.player.countryOrNbo).toBe("POL");
    expect(result.data.player.verificationStatus).toBe("verified");
  });

  it("rejects registration when WBF lookup confirms the number does not exist", async () => {
    const repository = createPlayerRepository();
    const authProvider = createAuthProvider();
    const service = createAuthService({
      players: repository,
      authProvider,
      wbfVerification: createWbfVerificationService("not_found"),
    });

    const result = await service.registerPlayerAccount({
      wbfNumber: "123456",
      email: "player@example.com",
      password: "safe-password",
    });

    expect(result).toEqual({ ok: false, error: "WBF_NUMBER_NOT_FOUND" });
    expect(authProvider.registerWithEmailPassword).not.toHaveBeenCalled();
  });

  it("rejects registration when strict WBF verification is required and lookup is unavailable", async () => {
    const repository = createPlayerRepository();
    const authProvider = createAuthProvider();
    const service = createAuthService({
      players: repository,
      authProvider,
      wbfVerification: createWbfVerificationService("unavailable"),
      requireWbfVerification: true,
    });

    const result = await service.registerPlayerAccount({
      wbfNumber: "123456",
      email: "player@example.com",
      password: "safe-password",
    });

    expect(result).toEqual({ ok: false, error: "WBF_VERIFICATION_UNAVAILABLE" });
    expect(authProvider.registerWithEmailPassword).not.toHaveBeenCalled();
  });

  it("rejects duplicate WBF numbers before creating an auth user", async () => {
    const repository = createPlayerRepository([buildPlayer()]);
    const authProvider = createAuthProvider();
    const service = createAuthService({ players: repository, authProvider });

    const result = await service.registerPlayerAccount({
      wbfNumber: "123456",
      email: "other@example.com",
      password: "safe-password",
    });

    expect(result).toEqual({ ok: false, error: "WBF_NUMBER_ALREADY_REGISTERED" });
    expect(authProvider.registerWithEmailPassword).not.toHaveBeenCalled();
  });

  it("logs in with WBF number by signing into the auth provider with the stored email", async () => {
    const loginTime = new Date("2026-09-02T12:00:00.000Z");
    const player = buildPlayer();
    const repository = createPlayerRepository([player]);
    const authProvider = createAuthProvider();
    const service = createAuthService({
      players: repository,
      authProvider,
      now: () => loginTime,
    });

    const result = await service.loginWithWbfNumber({
      wbfNumber: " 123456 ",
      password: "safe-password",
    });

    expect(result.ok).toBe(true);
    expect(authProvider.signInWithEmailPassword).toHaveBeenCalledWith("player@example.com", "safe-password");
    expect(player.lastLoginAt).toEqual(loginTime);
  });

  it("does not reveal whether an unknown WBF number exists during login", async () => {
    const repository = createPlayerRepository();
    const authProvider = createAuthProvider();
    const service = createAuthService({ players: repository, authProvider });

    const result = await service.loginWithWbfNumber({
      wbfNumber: "999999",
      password: "wrong-password",
    });

    expect(result).toEqual({ ok: false, error: "INVALID_CREDENTIALS" });
    expect(authProvider.signInWithEmailPassword).not.toHaveBeenCalled();
  });
});
