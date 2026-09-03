import type { AuthService } from "../auth/auth.service.js";
import type { AuthProvider } from "../auth/auth.types.js";
import type { CardService } from "../cards/card.service.js";
import type { CardExportService } from "../exports/index.js";
import type { PartnershipService } from "../partnerships/partnership.service.js";
import type { PlayerProfileService } from "../players/playerProfile.service.js";
import type { Player } from "../players/player.types.js";
import type { SharingService } from "../sharing/index.js";
import type { TemplateService } from "../templates/template.service.js";
import type { WbfVerificationService } from "../wbf-verification/index.js";

export type ApiServices = {
  auth: AuthService;
  authProvider: AuthProvider;
  cards: CardService;
  exports?: CardExportService;
  partnerships: PartnershipService;
  playerProfiles: PlayerProfileService;
  sharing: SharingService;
  templates: TemplateService;
  wbfVerification: WbfVerificationService;
};

export type ApiBindings = {
  Variables: {
    accessToken: string;
    player: Player;
  };
};
