import { api } from '../../../services/api';

export type CardStatus =
  | "draft"
  | "pending_partner_approval"
  | "partner_approved"
  | "partner_rejected"
  | "active"
  | "archived";

export interface ConventionCard {
  id: string;
  ownerPlayerId: string;
  partnershipId: string | null;
  sourceCardId: string | null;
  revisionNumber: number;
  title: string;
  status: CardStatus;
  cardData: Record<string, unknown>;
  submittedAt: string | null;
  partnerReviewedByPlayerId: string | null;
  partnerReviewedAt: string | null;
  partnerRejectionReason: string | null;
  activatedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const cardsApi = {
  /**
   * Pobiera listę kart konwencyjnych aktualnego gracza
   */
  listMyCards: async (): Promise<{ cards: ConventionCard[] }> => {
    return api.get<{ cards: ConventionCard[] }>('/cards');
  },

  /**
   * Pobiera szczegóły konkretnej karty
   */
  getCard: async (cardId: string): Promise<ConventionCard> => {
    return api.get<ConventionCard>(`/cards/${cardId}`);
  },

  /**
   * Tworzy nową, pustą kartę konwencyjną (draft)
   */
  createCard: async (title?: string, partnershipId?: string): Promise<ConventionCard> => {
    return api.post<ConventionCard>('/cards', { title, partnershipId });
  }
};
