import type { CardRepository } from "../cards/index.js";
import { err, ok, type Result } from "../shared/result.js";
import type { ActivityRepository } from "./activity.repository.js";
import type { ActivityEvent, CreateActivityEventInput } from "./activity.types.js";

export type ActivityServiceError = "CARD_NOT_FOUND" | "ACTIVITY_LIST_FAILED";

export type ActivityService = {
  recordEvent(input: CreateActivityEventInput): Promise<void>;
  listMyEvents(playerId: string, limit?: number): Promise<Result<ActivityEvent[], ActivityServiceError>>;
  listOwnedCardEvents(
    cardId: string,
    ownerPlayerId: string,
    limit?: number,
  ): Promise<Result<ActivityEvent[], ActivityServiceError>>;
};

export type ActivityWriter = Pick<ActivityService, "recordEvent">;

type ActivityServiceDeps = {
  activity: ActivityRepository;
  cards: Pick<CardRepository, "findOwnedCard">;
  defaultLimit?: number;
  maxLimit?: number;
  now?: () => Date;
};

function normalizeLimit(limit: number | undefined, defaultLimit: number, maxLimit: number): number {
  if (!limit) {
    return defaultLimit;
  }

  return Math.min(Math.max(Math.trunc(limit), 1), maxLimit);
}

export function createActivityService({
  activity,
  cards,
  defaultLimit = 50,
  maxLimit = 100,
  now = () => new Date(),
}: ActivityServiceDeps): ActivityService {
  return {
    async recordEvent(input) {
      try {
        await activity.create({
          ...input,
          createdAt: input.createdAt ?? now(),
        });
      } catch (error) {
        console.error("Failed to record activity event.", error);
      }
    },

    async listMyEvents(playerId, limit) {
      try {
        return ok(await activity.listForPlayer(playerId, normalizeLimit(limit, defaultLimit, maxLimit)));
      } catch (error) {
        return err("ACTIVITY_LIST_FAILED", error instanceof Error ? error.message : "Could not list activity events.");
      }
    },

    async listOwnedCardEvents(cardId, ownerPlayerId, limit) {
      const card = await cards.findOwnedCard(cardId, ownerPlayerId);

      if (!card) {
        return err("CARD_NOT_FOUND");
      }

      try {
        return ok(await activity.listForCard(cardId, normalizeLimit(limit, defaultLimit, maxLimit)));
      } catch (error) {
        return err("ACTIVITY_LIST_FAILED", error instanceof Error ? error.message : "Could not list activity events.");
      }
    },
  };
}
