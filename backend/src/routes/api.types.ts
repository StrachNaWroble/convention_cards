import type { AuthService } from "../auth/auth.service.js";
import type { AuthProvider } from "../auth/auth.types.js";
import type { CardService } from "../cards/card.service.js";
import type { PartnershipService } from "../partnerships/partnership.service.js";
import type { Player } from "../players/player.types.js";
import type { WbfVerificationService } from "../wbf-verification/index.js";

export type ApiServices = {
  auth: AuthService;
  authProvider: AuthProvider;
  cards: CardService;
  partnerships: PartnershipService;
  wbfVerification: WbfVerificationService;
};

export type ApiBindings = {
  Variables: {
    accessToken: string;
    player: Player;
  };
};
