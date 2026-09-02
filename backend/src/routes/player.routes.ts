import { Hono } from "hono";
import { z } from "zod";

import type { ApiBindings, ApiServices } from "./api.types.js";
import { createAuthMiddleware } from "./auth.middleware.js";
import { parseJsonBody } from "./requestValidation.js";
import { jsonError, jsonOk } from "./responses.js";

const updateProfileSchema = z.object({
  displayName: z.string().max(120, "Display name is too long.").nullable().optional(),
  countryOrNbo: z.string().max(80, "Country or NBO is too long.").nullable().optional(),
});

function playerErrorResponse(context: Parameters<typeof jsonError>[0], error: string, message?: string): Response {
  if (error === "PLAYER_NOT_FOUND") {
    return jsonError(context, 404, error, "Player was not found.");
  }

  if (error === "DISPLAY_NAME_TOO_LONG" || error === "COUNTRY_OR_NBO_TOO_LONG") {
    return jsonError(context, 422, error, message ?? "Profile value is too long.");
  }

  return jsonError(context, 400, error, message ?? "Could not process player request.");
}

export function createPlayerRoutes(services: ApiServices): Hono<ApiBindings> {
  const routes = new Hono<ApiBindings>();
  const requireAuth = createAuthMiddleware(services);

  routes.use("*", requireAuth);

  routes.get("/me", async (context) => {
    const result = await services.playerProfiles.getMyProfile(context.get("player"));

    if (!result.ok) {
      return playerErrorResponse(context, result.error, result.message);
    }

    return jsonOk(context, { player: result.data });
  });

  routes.patch("/me", async (context) => {
    const body = await parseJsonBody(context, updateProfileSchema);

    if (!body.ok) {
      return body.response;
    }

    const result = await services.playerProfiles.updateMyProfile(context.get("player").id, body.data);

    if (!result.ok) {
      return playerErrorResponse(context, result.error, result.message);
    }

    return jsonOk(context, { player: result.data });
  });

  return routes;
}
