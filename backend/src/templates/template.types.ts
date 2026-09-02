import type { ConventionCardData } from "../cards/card.types.js";

export type CardTemplate = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cardData: ConventionCardData;
  isSystemTemplate: boolean;
  createdAt: Date;
  updatedAt: Date;
};
