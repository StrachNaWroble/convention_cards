import { eq } from "drizzle-orm";

import type { Database } from "../db/client.js";
import { players } from "../db/schema.js";
import type { CreatePlayerInput, Player } from "./player.types.js";

export type PlayerRepository = {
  findByWbfNumber(wbfNumber: string): Promise<Player | null>;
  findByEmail(email: string): Promise<Player | null>;
  findByAuthUserId(authUserId: string): Promise<Player | null>;
  create(input: CreatePlayerInput): Promise<Player>;
  markLogin(authUserId: string, loggedInAt: Date): Promise<void>;
};

export function createDrizzlePlayerRepository(db: Database): PlayerRepository {
  return {
    async findByWbfNumber(wbfNumber) {
      const [player] = await db.select().from(players).where(eq(players.wbfNumber, wbfNumber)).limit(1);
      return player ?? null;
    },

    async findByEmail(email) {
      const [player] = await db.select().from(players).where(eq(players.email, email)).limit(1);
      return player ?? null;
    },

    async findByAuthUserId(authUserId) {
      const [player] = await db.select().from(players).where(eq(players.authUserId, authUserId)).limit(1);
      return player ?? null;
    },

    async create(input) {
      const [player] = await db
        .insert(players)
        .values({
          authUserId: input.authUserId,
          wbfNumber: input.wbfNumber,
          email: input.email,
          displayName: input.displayName,
          countryOrNbo: input.countryOrNbo,
          verificationStatus: input.verificationStatus ?? "pending",
          verificationSource: input.verificationSource,
          verificationCheckedAt: input.verificationCheckedAt,
        })
        .returning();

      return player;
    },

    async markLogin(authUserId, loggedInAt) {
      await db
        .update(players)
        .set({
          lastLoginAt: loggedInAt,
          updatedAt: loggedInAt,
        })
        .where(eq(players.authUserId, authUserId));
    },
  };
}
