import { and, desc, eq, or } from "drizzle-orm";

import type { Database } from "../db/client.js";
import { partnerships } from "../db/schema.js";
import type { CreatePartnershipRecordInput, Partnership, PartnershipStatus } from "./partnership.types.js";

export type PartnershipRepository = {
  create(input: CreatePartnershipRecordInput): Promise<Partnership>;
  listForPlayer(playerId: string, wbfNumber: string): Promise<Partnership[]>;
  findById(partnershipId: string): Promise<Partnership | null>;
  findForParticipant(partnershipId: string, playerId: string, wbfNumber: string): Promise<Partnership | null>;
  updateStatus(
    partnershipId: string,
    status: PartnershipStatus,
    updatedAt: Date,
    values?: { partnerPlayerId?: string | null; approvedAt?: Date | null },
  ): Promise<Partnership | null>;
};

export function createDrizzlePartnershipRepository(db: Database): PartnershipRepository {
  return {
    async create(input) {
      const [partnership] = await db
        .insert(partnerships)
        .values({
          ownerPlayerId: input.ownerPlayerId,
          partnerPlayerId: input.partnerPlayerId,
          partnerWbfNumber: input.partnerWbfNumber,
          status: "pending",
        })
        .returning();

      return partnership;
    },

    async listForPlayer(playerId, wbfNumber) {
      return db
        .select()
        .from(partnerships)
        .where(
          or(
            eq(partnerships.ownerPlayerId, playerId),
            eq(partnerships.partnerPlayerId, playerId),
            eq(partnerships.partnerWbfNumber, wbfNumber),
          ),
        )
        .orderBy(desc(partnerships.updatedAt));
    },

    async findById(partnershipId) {
      const [partnership] = await db
        .select()
        .from(partnerships)
        .where(eq(partnerships.id, partnershipId))
        .limit(1);

      return partnership ?? null;
    },

    async findForParticipant(partnershipId, playerId, wbfNumber) {
      const [partnership] = await db
        .select()
        .from(partnerships)
        .where(
          and(
            eq(partnerships.id, partnershipId),
            or(
              eq(partnerships.ownerPlayerId, playerId),
              eq(partnerships.partnerPlayerId, playerId),
              eq(partnerships.partnerWbfNumber, wbfNumber),
            ),
          ),
        )
        .limit(1);

      return partnership ?? null;
    },

    async updateStatus(partnershipId, status, updatedAt, values = {}) {
      const [partnership] = await db
        .update(partnerships)
        .set({
          status,
          updatedAt,
          ...values,
        })
        .where(eq(partnerships.id, partnershipId))
        .returning();

      return partnership ?? null;
    },
  };
}
