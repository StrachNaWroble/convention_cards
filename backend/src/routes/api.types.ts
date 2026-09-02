import type { AuthService } from "../auth/auth.service.js";
import type { AuthProvider } from "../auth/auth.types.js";
import type { CardService } from "../cards/card.service.js";
import type { Player } from "../players/player.types.js";

export type ApiServices = {
  auth: AuthService;
  authProvider: AuthProvider;
  cards: CardService;
};

export type ApiBindings = {
  Variables: {
    accessToken: string;
    player: Player;
  };
};
