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
   * Fetches current player's convention cards
   */
  listMyCards: async (): Promise<{ cards: ConventionCard[] }> => {
    return api.get<{ cards: ConventionCard[] }>('/cards');
  },

  /**
   * Fetches card details by ID
   */
  getCard: async (cardId: string): Promise<ConventionCard> => {
    return api.get<ConventionCard>(`/cards/${cardId}`);
  },

  /**
   * Creates a new empty draft card
   */
  createCard: async (title?: string, partnershipId?: string): Promise<ConventionCard> => {
    return api.post<ConventionCard>('/cards', { title, partnershipId });
  },

  /**
   * Updates an existing convention card
   */
  updateCard: async (cardId: string, updates: { title?: string; cardData?: any }): Promise<ConventionCard> => {
    return api.patch<ConventionCard>(`/cards/${cardId}`, updates);
  },

  /**
   * Archives a convention card (logical delete)
   */
  archiveCard: async (cardId: string): Promise<ConventionCard> => {
    return api.post<ConventionCard>(`/cards/${cardId}/archive`, {});
  }
};
