import type { PlayerRepository } from "../players/player.repository.js";
import type { Player } from "../players/player.types.js";
import { normalizeWbfNumber } from "../players/player.types.js";
import { err, ok, type Result } from "../shared/result.js";
import type { PartnershipRepository } from "./partnership.repository.js";
import type { CreatePartnershipInput, Partnership } from "./partnership.types.js";

export type PartnershipServiceError =
  | "PARTNER_WBF_NUMBER_REQUIRED"
  | "CANNOT_PARTNER_WITH_SELF"
  | "PARTNERSHIP_NOT_FOUND"
  | "PARTNERSHIP_NOT_PENDING"
  | "ONLY_PARTNER_CAN_APPROVE"
  | "ONLY_PARTNER_CAN_DECLINE"
  | "PARTNERSHIP_CREATE_FAILED";

export type PartnershipService = {
  createPartnership(input: CreatePartnershipInput): Promise<Result<Partnership, PartnershipServiceError>>;
  listMyPartnerships(player: Player): Promise<Result<Partnership[], PartnershipServiceError>>;
  approvePartnership(partnershipId: string, player: Player): Promise<Result<Partnership, PartnershipServiceError>>;
  declinePartnership(partnershipId: string, player: Player): Promise<Result<Partnership, PartnershipServiceError>>;
  archivePartnership(partnershipId: string, player: Player): Promise<Result<Partnership, PartnershipServiceError>>;
};

type PartnershipServiceDeps = {
  partnerships: PartnershipRepository;
  players: PlayerRepository;
  now?: () => Date;
};

function isInvitedPartner(partnership: Partnership, player: Player): boolean {
  return partnership.partnerPlayerId === player.id || partnership.partnerWbfNumber === player.wbfNumber;
}

export function createPartnershipService({
  partnerships,
  players,
  now = () => new Date(),
}: PartnershipServiceDeps): PartnershipService {
  return {
    async createPartnership(input) {
      const partnerWbfNumber = normalizeWbfNumber(input.partnerWbfNumber);
      const ownerWbfNumber = normalizeWbfNumber(input.ownerWbfNumber);

      if (!partnerWbfNumber) {
        return err("PARTNER_WBF_NUMBER_REQUIRED");
      }

      if (partnerWbfNumber === ownerWbfNumber) {
        return err("CANNOT_PARTNER_WITH_SELF");
      }

      const partner = await players.findByWbfNumber(partnerWbfNumber);

      try {
        const partnership = await partnerships.create({
          ownerPlayerId: input.ownerPlayerId,
          partnerPlayerId: partner?.id ?? null,
          partnerWbfNumber,
        });

        return ok(partnership);
      } catch (error) {
        return err(
          "PARTNERSHIP_CREATE_FAILED",
          error instanceof Error ? error.message : "Could not create partnership.",
        );
      }
    },

    async listMyPartnerships(player) {
      return ok(await partnerships.listForPlayer(player.id, player.wbfNumber));
    },

    async approvePartnership(partnershipId, player) {
      const partnership = await partnerships.findForParticipant(partnershipId, player.id, player.wbfNumber);

      if (!partnership) {
        return err("PARTNERSHIP_NOT_FOUND");
      }

      if (!isInvitedPartner(partnership, player)) {
        return err("ONLY_PARTNER_CAN_APPROVE");
      }

      if (partnership.status !== "pending") {
        return err("PARTNERSHIP_NOT_PENDING");
      }

      const approvedAt = now();
      const updated = await partnerships.updateStatus(partnershipId, "approved", approvedAt, {
        partnerPlayerId: player.id,
        approvedAt,
      });

      if (!updated) {
        return err("PARTNERSHIP_NOT_FOUND");
      }

      return ok(updated);
    },

    async declinePartnership(partnershipId, player) {
      const partnership = await partnerships.findForParticipant(partnershipId, player.id, player.wbfNumber);

      if (!partnership) {
        return err("PARTNERSHIP_NOT_FOUND");
      }

      if (!isInvitedPartner(partnership, player)) {
        return err("ONLY_PARTNER_CAN_DECLINE");
      }

      if (partnership.status !== "pending") {
        return err("PARTNERSHIP_NOT_PENDING");
      }

      const updated = await partnerships.updateStatus(partnershipId, "declined", now(), {
        partnerPlayerId: player.id,
      });

      if (!updated) {
        return err("PARTNERSHIP_NOT_FOUND");
      }

      return ok(updated);
    },

    async archivePartnership(partnershipId, player) {
      const partnership = await partnerships.findForParticipant(partnershipId, player.id, player.wbfNumber);

      if (!partnership) {
        return err("PARTNERSHIP_NOT_FOUND");
      }

      const updated = await partnerships.updateStatus(partnershipId, "archived", now());

      if (!updated) {
        return err("PARTNERSHIP_NOT_FOUND");
      }

      return ok(updated);
    },
  };
}
