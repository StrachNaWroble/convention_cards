import type { ConventionCardData } from "../cards/card.types.js";

export type CardExportPayload = {
  export: {
    kind: "wbf-convention-card";
    format: "json";
    version: 1;
    generatedAt: string;
  };
  layout: {
    profile: "wbf-two-page";
    pageCount: 2;
  };
  owner: {
    playerId: string;
    wbfNumber: string;
    displayName: string | null;
    countryOrNbo: string | null;
  };
  card: {
    id: string;
    title: string;
    revisionNumber: number;
    status: string;
    cardData: ConventionCardData;
    activatedAt: Date | null;
    updatedAt: Date;
  };
};
