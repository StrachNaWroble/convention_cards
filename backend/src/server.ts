import "dotenv/config";

import { serve } from "@hono/node-server";

import { createAuthService, createSupabaseAuthProvider } from "./auth/index.js";
import { createCardService } from "./cards/index.js";
import { loadAppEnv } from "./config/env.js";
import { createDatabaseClient } from "./db/index.js";
import { createDrizzleCardRepository } from "./cards/card.repository.js";
import { createApp } from "./app.js";
import { createDrizzlePartnershipRepository, createPartnershipService } from "./partnerships/index.js";
import { createDrizzlePlayerRepository } from "./players/player.repository.js";
import { createCardValidationService } from "./validation/index.js";

const env = loadAppEnv();
const database = createDatabaseClient(env.databaseUrl, { ssl: true });
const authProvider = createSupabaseAuthProvider(env);
const playerRepository = createDrizzlePlayerRepository(database.db);
const cardRepository = createDrizzleCardRepository(database.db);
const partnershipRepository = createDrizzlePartnershipRepository(database.db);
const auth = createAuthService({
  players: playerRepository,
  authProvider,
});
const cards = createCardService({
  cards: cardRepository,
  partnerships: partnershipRepository,
  validation: createCardValidationService(),
});
const partnerships = createPartnershipService({
  partnerships: partnershipRepository,
  players: playerRepository,
});
const app = createApp({
  auth,
  authProvider,
  cards,
  partnerships,
});
const port = Number(process.env.PORT ?? "3000");

serve(
  {
    fetch: app.fetch,
    port,
  },
  () => {
    console.log(`API server listening on http://localhost:${port}`);
  },
);
