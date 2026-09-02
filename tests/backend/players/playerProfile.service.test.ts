import { describe, expect, it } from "vitest";

import { createPlayerProfileService } from "../../../backend/src/players/playerProfile.service.js";
import type { PlayerRepository } from "../../../backend/src/players/player.repository.js";
import type { CreatePlayerInput, Player, UpdatePlayerProfileInput } from "../../../backend/src/players/player.types.js";

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

function createPlayerRepository(seed: Player[] = []): Pick<PlayerRepository, "updateProfile"> {
  const players = [...seed];

  return {
    async updateProfile(playerId: string, input: UpdatePlayerProfileInput, updatedAt: Date) {
      const player = players.find((candidate) => candidate.id === playerId);

      if (!player) {
        return null;
      }

      if (input.displayName !== undefined) {
        player.displayName = input.displayName;
      }

      if (input.countryOrNbo !== undefined) {
        player.countryOrNbo = input.countryOrNbo;
      }

      player.updatedAt = updatedAt;
      return player;
    },
  };
}

describe("player profile service", () => {
  it("returns the current player profile", async () => {
    const player = buildPlayer();
    const service = createPlayerProfileService({ players: createPlayerRepository([player]) });

    const result = await service.getMyProfile(player);

    expect(result).toEqual({ ok: true, data: player });
  });

  it("updates editable profile fields and trims values", async () => {
    const updateTime = new Date("2026-09-02T12:00:00.000Z");
    const player = buildPlayer();
    const service = createPlayerProfileService({
      players: createPlayerRepository([player]),
      now: () => updateTime,
    });

    const result = await service.updateMyProfile("player-1", {
      displayName: "  New Name  ",
      countryOrNbo: "  DEN  ",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.displayName).toBe("New Name");
    expect(result.data.countryOrNbo).toBe("DEN");
    expect(result.data.email).toBe("player@example.com");
    expect(result.data.wbfNumber).toBe("123456");
    expect(result.data.updatedAt).toEqual(updateTime);
  });

  it("stores blank editable fields as null", async () => {
    const player = buildPlayer({ displayName: "Test Player", countryOrNbo: "POL" });
    const service = createPlayerProfileService({ players: createPlayerRepository([player]) });

    const result = await service.updateMyProfile("player-1", {
      displayName: "  ",
      countryOrNbo: null,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.displayName).toBeNull();
    expect(result.data.countryOrNbo).toBeNull();
  });

  it("returns not found when the player does not exist", async () => {
    const service = createPlayerProfileService({ players: createPlayerRepository() });

    const result = await service.updateMyProfile("missing-player", {
      displayName: "New Name",
    });

    expect(result).toEqual({ ok: false, error: "PLAYER_NOT_FOUND" });
  });

  it("rejects profile values that are too long", async () => {
    const service = createPlayerProfileService({ players: createPlayerRepository([buildPlayer()]) });

    const result = await service.updateMyProfile("player-1", {
      displayName: "x".repeat(121),
    });

    expect(result).toEqual({
      ok: false,
      error: "DISPLAY_NAME_TOO_LONG",
      message: "Display name is too long.",
    });
  });
});
