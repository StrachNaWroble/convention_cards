import { createMiddleware } from "hono/factory";

import type { ApiBindings, ApiServices } from "./api.types.js";
import { jsonError } from "./responses.js";

export function createAuthMiddleware(services: Pick<ApiServices, "auth" | "authProvider">) {
  return createMiddleware<ApiBindings>(async (context, next) => {
    const authorization = context.req.header("authorization");
    const match = authorization?.match(/^Bearer\s+(.+)$/i);

    if (!match) {
      return jsonError(context, 401, "UNAUTHORIZED", "Missing bearer token.");
    }

    const accessToken = match[1];
    const authUser = await services.authProvider.getUserByAccessToken(accessToken);

    if (!authUser.ok) {
      return jsonError(context, 401, "UNAUTHORIZED", "Session is invalid or expired.");
    }

    const player = await services.auth.getCurrentPlayer(authUser.data.id);

    if (!player.ok) {
      return jsonError(context, 401, "UNAUTHORIZED", "No player profile is linked to this session.");
    }

    context.set("accessToken", accessToken);
    context.set("player", player.data);

    return next();
  });
}
