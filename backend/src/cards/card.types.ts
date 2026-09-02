export type ConventionCardData = Record<string, unknown>;

export type CardStatus = "draft" | "pending_partner_approval" | "active" | "archived";

export type ConventionCard = {
  id: string;
  ownerPlayerId: string;
  partnershipId: string | null;
  title: string;
  status: CardStatus;
  cardData: ConventionCardData;
  submittedAt: Date | null;
  activatedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateCardDraftInput = {
  ownerPlayerId: string;
  partnershipId?: string | null;
  title?: string;
  cardData?: ConventionCardData;
};

export type UpdateCardDraftInput = {
  cardId: string;
  ownerPlayerId: string;
  title?: string;
  cardData?: ConventionCardData;
};
