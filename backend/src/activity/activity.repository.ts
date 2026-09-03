import { and, desc, eq, inArray, sql } from "drizzle-orm";

import type { Database } from "../db/client.js";
import { activityEvents } from "../db/schema.js";
import type { ActivityEvent, ActivityListFilters, CreateActivityEventInput } from "./activity.types.js";

export type ActivityRepository = {
  create(input: CreateActivityEventInput): Promise<ActivityEvent>;
  listForPlayer(playerId: string, limit: number, filters?: ActivityListFilters): Promise<ActivityEvent[]>;
  listForCard(cardId: string, limit: number): Promise<ActivityEvent[]>;
};

export function createDrizzleActivityRepository(db: Database): ActivityRepository {
  return {
    async create(input) {
      const [event] = await db
        .insert(activityEvents)
        .values({
          eventType: input.eventType,
          actorPlayerId: input.actorPlayerId ?? null,
          entityType: input.entityType,
          entityId: input.entityId ?? null,
          cardId: input.cardId ?? null,
          partnershipId: input.partnershipId ?? null,
          shareLinkId: input.shareLinkId ?? null,
          metadata: input.metadata ?? {},
          createdAt: input.createdAt,
        })
        .returning();

      return event as ActivityEvent;
    },

    async listForPlayer(playerId, limit, filters = {}) {
      const conditions = [
        sql`
          ${activityEvents.actorPlayerId} = ${playerId}
          OR EXISTS (
            SELECT 1
            FROM convention_cards
            WHERE convention_cards.id = ${activityEvents.cardId}
              AND convention_cards.owner_player_id = ${playerId}
          )
          OR EXISTS (
            SELECT 1
            FROM partnerships
            WHERE partnerships.id = ${activityEvents.partnershipId}
              AND (
                partnerships.owner_player_id = ${playerId}
                OR partnerships.partner_player_id = ${playerId}
                OR partnerships.partner_wbf_number = (
                  SELECT players.wbf_number
                  FROM players
                  WHERE players.id = ${playerId}
                )
              )
          )
        `,
      ];

      if (filters.eventTypes?.length) {
        conditions.push(inArray(activityEvents.eventType, filters.eventTypes));
      }

      if (filters.entityTypes?.length) {
        conditions.push(inArray(activityEvents.entityType, filters.entityTypes));
      }

      if (filters.cardId) {
        conditions.push(eq(activityEvents.cardId, filters.cardId));
      }

      if (filters.partnershipId) {
        conditions.push(eq(activityEvents.partnershipId, filters.partnershipId));
      }

      if (filters.shareLinkId) {
        conditions.push(eq(activityEvents.shareLinkId, filters.shareLinkId));
      }

      const events = await db
        .select()
        .from(activityEvents)
        .where(and(...conditions))
        .orderBy(desc(activityEvents.createdAt))
        .limit(limit);

      return events as ActivityEvent[];
    },

    async listForCard(cardId, limit) {
      const events = await db
        .select()
        .from(activityEvents)
        .where(eq(activityEvents.cardId, cardId))
        .orderBy(desc(activityEvents.createdAt))
        .limit(limit);

      return events as ActivityEvent[];
    },
  };
}
