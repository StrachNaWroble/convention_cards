import { describe, expect, it } from "vitest";

import type { PartnershipRepository } from "../../../backend/src/partnerships/partnership.repository.js";
import { createPartnershipService } from "../../../backend/src/partnerships/partnership.service.js";
import type { CreatePartnershipRecordInput, Partnership, PartnershipStatus } from "../../../backend/src/partnerships/partnership.types.js";
import type { PlayerRepository } from "../../../backend/src/players/player.repository.js";
import type { CreatePlayerInput, Player } from "../../../backend/src/players/player.types.js";

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

function createPlayerRepository(seed: Player[]): PlayerRepository {
  return {
    async findByWbfNumber(wbfNumber) {
      return seed.find((player) => player.wbfNumber === wbfNumber) ?? null;
    },
    async findByEmail(email) {
      return seed.find((player) => player.email === email) ?? null;
    },
    async findByAuthUserId(authUserId) {
      return seed.find((player) => player.authUserId === authUserId) ?? null;
    },
    async create(input: CreatePlayerInput) {
      const player = buildPlayer({
        id: `player-${seed.length + 1}`,
        authUserId: input.authUserId,
        wbfNumber: input.wbfNumber,
        email: input.email,
      });
      seed.push(player);
      return player;
    },
    async updateProfile(playerId, input, updatedAt) {
      const player = seed.find((candidate) => candidate.id === playerId);
      if (!player) return null;
      if (input.displayName !== undefined) player.displayName = input.displayName;
      if (input.countryOrNbo !== undefined) player.countryOrNbo = input.countryOrNbo;
      player.updatedAt = updatedAt;
      return player;
    },
    async markLogin() {
      return undefined;
    },
  };
}

function createPartnershipRepository(seed: Partnership[] = []): PartnershipRepository {
  const partnerships = [...seed];

  return {
    async create(input: CreatePartnershipRecordInput) {
      const partnership = buildPartnership({
        id: `partnership-${partnerships.length + 1}`,
        ownerPlayerId: input.ownerPlayerId,
        partnerPlayerId: input.partnerPlayerId ?? null,
        partnerWbfNumber: input.partnerWbfNumber,
      });
      partnerships.push(partnership);
      return partnership;
    },
    async listForPlayer(playerId, wbfNumber) {
      return partnerships.filter(
        (partnership) =>
          partnership.ownerPlayerId === playerId ||
          partnership.partnerPlayerId === playerId ||
          partnership.partnerWbfNumber === wbfNumber,
      );
    },
    async findById(partnershipId) {
      return partnerships.find((partnership) => partnership.id === partnershipId) ?? null;
    },
    async findForParticipant(partnershipId, playerId, wbfNumber) {
      return (
        partnerships.find(
          (partnership) =>
            partnership.id === partnershipId &&
            (partnership.ownerPlayerId === playerId ||
              partnership.partnerPlayerId === playerId ||
              partnership.partnerWbfNumber === wbfNumber),
        ) ?? null
      );
    },
    async updateStatus(partnershipId, status: PartnershipStatus, updatedAt, values = {}) {
      const partnership = partnerships.find((candidate) => candidate.id === partnershipId);
      if (!partnership) return null;

      partnership.status = status;
      partnership.updatedAt = updatedAt;
      if (values.partnerPlayerId !== undefined) partnership.partnerPlayerId = values.partnerPlayerId;
      if (values.approvedAt !== undefined) partnership.approvedAt = values.approvedAt;
      return partnership;
    },
  };
}

describe("partnership service", () => {
  it("creates a pending partnership by partner WBF number", async () => {
    const owner = buildPlayer();
    const partner = buildPlayer({
      id: "player-2",
      authUserId: "auth-user-2",
      wbfNumber: "654321",
      email: "partner@example.com",
    });
    const service = createPartnershipService({
      partnerships: createPartnershipRepository(),
      players: createPlayerRepository([owner, partner]),
    });

    const result = await service.createPartnership({
      ownerPlayerId: owner.id,
      ownerWbfNumber: owner.wbfNumber,
      partnerWbfNumber: " 654 321 ",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.status).toBe("pending");
    expect(result.data.partnerPlayerId).toBe("player-2");
    expect(result.data.partnerWbfNumber).toBe("654321");
  });

  it("rejects creating a partnership with yourself", async () => {
    const owner = buildPlayer();
    const service = createPartnershipService({
      partnerships: createPartnershipRepository(),
      players: createPlayerRepository([owner]),
    });

    const result = await service.createPartnership({
      ownerPlayerId: owner.id,
      ownerWbfNumber: owner.wbfNumber,
      partnerWbfNumber: owner.wbfNumber,
    });

    expect(result).toEqual({ ok: false, error: "CANNOT_PARTNER_WITH_SELF" });
  });

  it("lets the invited partner approve and links their player id", async () => {
    const approvedAt = new Date("2026-09-02T12:00:00.000Z");
    const partner = buildPlayer({
      id: "player-2",
      authUserId: "auth-user-2",
      wbfNumber: "654321",
      email: "partner@example.com",
    });
    const service = createPartnershipService({
      partnerships: createPartnershipRepository([buildPartnership()]),
      players: createPlayerRepository([partner]),
      now: () => approvedAt,
    });

    const result = await service.approvePartnership("partnership-1", partner);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.status).toBe("approved");
    expect(result.data.partnerPlayerId).toBe("player-2");
    expect(result.data.approvedAt).toEqual(approvedAt);
  });

  it("blocks the owner from approving their own partnership request", async () => {
    const owner = buildPlayer();
    const service = createPartnershipService({
      partnerships: createPartnershipRepository([buildPartnership()]),
      players: createPlayerRepository([owner]),
    });

    const result = await service.approvePartnership("partnership-1", owner);

    expect(result).toEqual({ ok: false, error: "ONLY_PARTNER_CAN_APPROVE" });
  });
});
