import { and, desc, eq, or } from "drizzle-orm";

import type { Database } from "../db/client.js";
import { conventionCards, partnerships } from "../db/schema.js";
import type {
  CardStatus,
  ConventionCard,
  CreateCardDraftInput,
  PartnerCardReviewStatus,
  UpdateCardDraftInput,
} from "./card.types.js";

export type CardRepository = {
  createDraft(input: Required<Omit<CreateCardDraftInput, "partnershipId">> & { partnershipId: string | null }): Promise<ConventionCard>;
  listByOwner(ownerPlayerId: string): Promise<ConventionCard[]>;
  listPendingReviewForPartner(playerId: string, wbfNumber: string): Promise<ConventionCard[]>;
  findOwnedCard(cardId: string, ownerPlayerId: string): Promise<ConventionCard | null>;
  findCardForPartnerReview(cardId: string, playerId: string, wbfNumber: string): Promise<ConventionCard | null>;
  updateDraft(input: UpdateCardDraftInput, updatedAt: Date): Promise<ConventionCard | null>;
  updateStatus(cardId: string, ownerPlayerId: string, status: CardStatus, updatedAt: Date): Promise<ConventionCard | null>;
  updatePartnerReviewStatus(input: {
    cardId: string;
    reviewedByPlayerId: string;
    status: PartnerCardReviewStatus;
    reviewedAt: Date;
    rejectionReason?: string | null;
  }): Promise<ConventionCard | null>;
};

export function createDrizzleCardRepository(db: Database): CardRepository {
  return {
    async createDraft(input) {
      const [card] = await db
        .insert(conventionCards)
        .values({
          ownerPlayerId: input.ownerPlayerId,
          partnershipId: input.partnershipId,
          title: input.title,
          cardData: input.cardData,
          status: "draft",
        })
        .returning();

      return card;
    },

    async listByOwner(ownerPlayerId) {
      return db
        .select()
        .from(conventionCards)
        .where(eq(conventionCards.ownerPlayerId, ownerPlayerId))
        .orderBy(desc(conventionCards.updatedAt));
    },

    async listPendingReviewForPartner(playerId, wbfNumber) {
      const rows = await db
        .select({ card: conventionCards })
        .from(conventionCards)
        .innerJoin(partnerships, eq(partnerships.id, conventionCards.partnershipId))
        .where(
          and(
            eq(conventionCards.status, "pending_partner_approval"),
            eq(partnerships.status, "approved"),
            or(eq(partnerships.partnerPlayerId, playerId), eq(partnerships.partnerWbfNumber, wbfNumber)),
          ),
        )
        .orderBy(desc(conventionCards.submittedAt), desc(conventionCards.updatedAt));

      return rows.map((row) => row.card);
    },

    async findOwnedCard(cardId, ownerPlayerId) {
      const [card] = await db
        .select()
        .from(conventionCards)
        .where(and(eq(conventionCards.id, cardId), eq(conventionCards.ownerPlayerId, ownerPlayerId)))
        .limit(1);

      return card ?? null;
    },

    async findCardForPartnerReview(cardId, playerId, wbfNumber) {
      const [row] = await db
        .select({ card: conventionCards })
        .from(conventionCards)
        .innerJoin(partnerships, eq(partnerships.id, conventionCards.partnershipId))
        .where(
          and(
            eq(conventionCards.id, cardId),
            eq(partnerships.status, "approved"),
            or(eq(partnerships.partnerPlayerId, playerId), eq(partnerships.partnerWbfNumber, wbfNumber)),
          ),
        )
        .limit(1);

      return row?.card ?? null;
    },

    async updateDraft(input, updatedAt) {
      const updateValues: Partial<typeof conventionCards.$inferInsert> = {
        updatedAt,
      };

      if (input.title !== undefined) {
        updateValues.title = input.title;
      }

      if (input.cardData !== undefined) {
        updateValues.cardData = input.cardData;
      }

      const [card] = await db
        .update(conventionCards)
        .set(updateValues)
        .where(
          and(
            eq(conventionCards.id, input.cardId),
            eq(conventionCards.ownerPlayerId, input.ownerPlayerId),
            eq(conventionCards.status, "draft"),
          ),
        )
        .returning();

      return card ?? null;
    },

    async updateStatus(cardId, ownerPlayerId, status, updatedAt) {
      const statusDates: Partial<typeof conventionCards.$inferInsert> = {};

      if (status === "pending_partner_approval") {
        statusDates.submittedAt = updatedAt;
        statusDates.partnerReviewedByPlayerId = null;
        statusDates.partnerReviewedAt = null;
        statusDates.partnerRejectionReason = null;
      }

      if (status === "active") {
        statusDates.activatedAt = updatedAt;
      }

      if (status === "archived") {
        statusDates.archivedAt = updatedAt;
      }

      const [card] = await db
        .update(conventionCards)
        .set({
          status,
          updatedAt,
          ...statusDates,
        })
        .where(and(eq(conventionCards.id, cardId), eq(conventionCards.ownerPlayerId, ownerPlayerId)))
        .returning();

      return card ?? null;
    },

    async updatePartnerReviewStatus(input) {
      const [card] = await db
        .update(conventionCards)
        .set({
          status: input.status,
          partnerReviewedByPlayerId: input.reviewedByPlayerId,
          partnerReviewedAt: input.reviewedAt,
          partnerRejectionReason: input.status === "partner_rejected" ? input.rejectionReason ?? null : null,
          updatedAt: input.reviewedAt,
        })
        .where(and(eq(conventionCards.id, input.cardId), eq(conventionCards.status, "pending_partner_approval")))
        .returning();

      return card ?? null;
    },
  };
}
