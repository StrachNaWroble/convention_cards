import type { ConventionCardData } from "../cards/card.types.js";

export const BLANK_WBF_TEMPLATE_SLUG = "blank-wbf-card";

export const blankWbfCardData: ConventionCardData = {
  meta: {
    format: "wbf",
    version: 1,
  },
  players: {
    northSouth: {
      playerOne: "",
      playerTwo: "",
    },
  },
  system: {
    generalApproach: "",
    openingStyle: "",
  },
  openings: {},
  competitive: {},
  defensive: {},
  leadsAndSignals: {},
  notes: {},
};
