import { err, ok, type Result } from "../shared/result.js";
import type { PlayerRepository } from "./player.repository.js";
import type { Player, UpdatePlayerProfileInput } from "./player.types.js";

const MAX_DISPLAY_NAME_LENGTH = 120;
const MAX_COUNTRY_OR_NBO_LENGTH = 80;

export type PlayerProfileServiceError =
  | "PLAYER_NOT_FOUND"
  | "DISPLAY_NAME_TOO_LONG"
  | "COUNTRY_OR_NBO_TOO_LONG";

export type PlayerProfileService = {
  getMyProfile(player: Player): Promise<Result<Player, PlayerProfileServiceError>>;
  updateMyProfile(
    playerId: string,
    input: UpdatePlayerProfileInput,
  ): Promise<Result<Player, PlayerProfileServiceError>>;
};

type PlayerProfileServiceDeps = {
  players: Pick<PlayerRepository, "updateProfile">;
  now?: () => Date;
};

function cleanNullableText(value: string | null | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return value.trim() || null;
}

export function createPlayerProfileService({
  players,
  now = () => new Date(),
}: PlayerProfileServiceDeps): PlayerProfileService {
  return {
    async getMyProfile(player) {
      return ok(player);
    },

    async updateMyProfile(playerId, input) {
      const displayName = cleanNullableText(input.displayName);
      const countryOrNbo = cleanNullableText(input.countryOrNbo);
      const profile: UpdatePlayerProfileInput = {};

      if (displayName !== undefined) {
        if (displayName && displayName.length > MAX_DISPLAY_NAME_LENGTH) {
          return err("DISPLAY_NAME_TOO_LONG", "Display name is too long.");
        }

        profile.displayName = displayName;
      }

      if (countryOrNbo !== undefined) {
        if (countryOrNbo && countryOrNbo.length > MAX_COUNTRY_OR_NBO_LENGTH) {
          return err("COUNTRY_OR_NBO_TOO_LONG", "Country or NBO is too long.");
        }

        profile.countryOrNbo = countryOrNbo;
      }

      const player = await players.updateProfile(playerId, profile, now());

      if (!player) {
        return err("PLAYER_NOT_FOUND");
      }

      return ok(player);
    },
  };
}
