import "dotenv/config";

import { serve } from "@hono/node-server";

import { createActivityService, createDrizzleActivityRepository } from "./activity/index.js";
import { createAuthService, createSupabaseAuthProvider } from "./auth/index.js";
import { createCardService } from "./cards/index.js";
import { loadAppEnv } from "./config/env.js";
import { createDatabaseClient } from "./db/index.js";
import { createDrizzleCardRepository } from "./cards/card.repository.js";
import { createApp } from "./app.js";
import { createCardExportService } from "./exports/index.js";
import { createDrizzlePartnershipRepository, createPartnershipService } from "./partnerships/index.js";
import { createPlayerProfileService } from "./players/playerProfile.service.js";
import { createDrizzlePlayerRepository } from "./players/player.repository.js";
import { createDrizzleSharingRepository, createSharingService } from "./sharing/index.js";
import { createDrizzleTemplateRepository, createTemplateService } from "./templates/index.js";
import { createCardValidationService } from "./validation/index.js";
import { createWbfPeopleFinderService } from "./wbf-verification/index.js";

const env = loadAppEnv();
const database = createDatabaseClient(env.databaseUrl, { ssl: true });
const authProvider = createSupabaseAuthProvider(env);
const playerRepository = createDrizzlePlayerRepository(database.db);
const cardRepository = createDrizzleCardRepository(database.db);
const partnershipRepository = createDrizzlePartnershipRepository(database.db);
const sharingRepository = createDrizzleSharingRepository(database.db);
const templateRepository = createDrizzleTemplateRepository(database.db);
const activityRepository = createDrizzleActivityRepository(database.db);
const cardValidation = createCardValidationService();
const activity = createActivityService({
  activity: activityRepository,
  cards: cardRepository,
});
const auth = createAuthService({
  players: playerRepository,
  authProvider,
  wbfVerification: createWbfPeopleFinderService(),
  requireWbfVerification: env.requireWbfVerification,
  passwordResetRedirectTo: env.passwordResetRedirectTo,
  activity,
});
const cards = createCardService({
  cards: cardRepository,
  partnerships: partnershipRepository,
  validation: cardValidation,
  activity,
});
const cardExports = createCardExportService({
  cards,
  validation: cardValidation,
  activity,
});
const partnerships = createPartnershipService({
  partnerships: partnershipRepository,
  players: playerRepository,
  activity,
});
const playerProfiles = createPlayerProfileService({
  players: playerRepository,
});
const templates = createTemplateService(templateRepository);
const sharing = createSharingService({
  cards: cardRepository,
  partnerships: partnershipRepository,
  sharing: sharingRepository,
  activity,
});
const app = createApp({
  activity,
  auth,
  authProvider,
  cards,
  exports: cardExports,
  partnerships,
  playerProfiles,
  sharing,
  templates,
  wbfVerification: createWbfPeopleFinderService(),
}, {
  cors: env.cors,
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
