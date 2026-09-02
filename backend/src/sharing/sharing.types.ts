import type { ConventionCard, ConventionCardData } from "../cards/card.types.js";

export type ShareLink = {
  id: string;
  cardId: string;
  tokenHash: string;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
};

export type PublicShareLink = Omit<ShareLink, "tokenHash">;

export type CreateShareLinkInput = {
  cardId: string;
  tokenHash: string;
  expiresAt?: Date | null;
};

export type CreateShareLinkResult = {
  link: PublicShareLink;
  token: string;
};

export type SharedCardPlayer = {
  displayName: string | null;
  wbfNumber: string;
};

export type PublicSharedCard = {
  card: Pick<ConventionCard, "id" | "title" | "status" | "cardData" | "updatedAt">;
  players: {
    owner: SharedCardPlayer;
    partner: SharedCardPlayer | null;
  };
  shareLink: {
    id: string;
    expiresAt: Date | null;
    createdAt: Date;
  };
};

export type ShareableCard = {
  id: string;
  title: string;
  status: "active";
  cardData: ConventionCardData;
  updatedAt: Date;
};
