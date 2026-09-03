import { Hono } from "hono";
import { z } from "zod";

import type { ApiBindings, ApiServices } from "./api.types.js";
import { createAuthMiddleware } from "./auth.middleware.js";
import { jsonError, jsonOk } from "./responses.js";

const activityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

function parseActivityLimit(context: Parameters<typeof jsonError>[0]): { ok: true; limit?: number } | { ok: false; response: Response } {
  const result = activityQuerySchema.safeParse({
    limit: context.req.query("limit"),
  });

  if (!result.success) {
    return {
      ok: false,
      response: jsonError(context, 422, "VALIDATION_ERROR", result.error.issues[0]?.message ?? "Invalid query."),
    };
  }

  return {
    ok: true,
    limit: result.data.limit,
  };
}

function activityErrorResponse(context: Parameters<typeof jsonError>[0], error: string, message?: string): Response {
  if (error === "CARD_NOT_FOUND") {
    return jsonError(context, 404, error, "Card was not found.");
  }

  return jsonError(context, 400, error, message ?? "Could not load activity events.");
}

export function createActivityRoutes(services: ApiServices): Hono<ApiBindings> {
  const routes = new Hono<ApiBindings>();
  const requireAuth = createAuthMiddleware(services);

  routes.use("*", requireAuth);

  routes.get("/", async (context) => {
    if (!services.activity) {
      return jsonError(context, 500, "ACTIVITY_NOT_CONFIGURED", "Activity service is not configured.");
    }

    const query = parseActivityLimit(context);
    if (!query.ok) {
      return query.response;
    }

    const result = await services.activity.listMyEvents(context.get("player").id, query.limit);

    if (!result.ok) {
      return activityErrorResponse(context, result.error, result.message);
    }

    return jsonOk(context, { events: result.data });
  });

  return routes;
}
