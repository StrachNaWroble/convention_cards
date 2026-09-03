import { Hono } from "hono";
import { z } from "zod";

import type { ApiBindings, ApiServices } from "./api.types.js";
import { createAuthMiddleware } from "./auth.middleware.js";
import { parseJsonBody } from "./requestValidation.js";
import { jsonError, jsonOk } from "./responses.js";

const createShareLinkSchema = z.object({
  expiresAt: z.string().datetime().optional(),
});

function sharingErrorResponse(context: Parameters<typeof jsonError>[0], error: string, message?: string): Response {
  if (error === "CARD_NOT_FOUND" || error === "SHARE_LINK_NOT_FOUND") {
    return jsonError(context, 404, error, message ?? "Share link was not found.");
  }

  if (error === "CARD_NOT_SHAREABLE" || error === "PARTNERSHIP_NOT_APPROVED") {
    return jsonError(context, 409, error, message ?? "This card cannot be shared yet.");
  }

  if (error === "SHARE_LINK_EXPIRY_IN_PAST") {
    return jsonError(context, 422, error, message ?? "Share link expiry must be in the future.");
  }

  return jsonError(context, 400, error, message ?? "Could not process sharing request.");
}

export function createAuthenticatedSharingRoutes(services: ApiServices): Hono<ApiBindings> {
  const routes = new Hono<ApiBindings>();
  const requireAuth = createAuthMiddleware(services);

  routes.use("*", requireAuth);

  routes.post("/:shareLinkId/revoke", async (context) => {
    const result = await services.sharing.revokeShareLink(
      context.req.param("shareLinkId"),
      context.get("player").id,
    );

    if (!result.ok) {
      return sharingErrorResponse(context, result.error, result.message);
    }

    return jsonOk(context, result.data);
  });

  return routes;
}

export function createPublicSharingRoutes(services: ApiServices): Hono<ApiBindings> {
  const routes = new Hono<ApiBindings>();

  routes.get("/cards/:token", async (context) => {
    const result = await services.sharing.getPublicSharedCard(context.req.param("token"));

    if (!result.ok) {
      return sharingErrorResponse(context, result.error, result.message);
    }

    return jsonOk(context, result.data);
  });

  return routes;
}

export function createShareLinkRoutes(services: ApiServices): Hono<ApiBindings> {
  const routes = new Hono<ApiBindings>();
  const requireAuth = createAuthMiddleware(services);

  routes.use("*", requireAuth);

  routes.get("/:cardId/share-links", async (context) => {
    const result = await services.sharing.listShareLinks(context.req.param("cardId"), context.get("player").id);

    if (!result.ok) {
      return sharingErrorResponse(context, result.error, result.message);
    }

    return jsonOk(context, { shareLinks: result.data });
  });

  routes.post("/:cardId/share-links", async (context) => {
    const body = await parseJsonBody(context, createShareLinkSchema);

    if (!body.ok) {
      return body.response;
    }

    const result = await services.sharing.createShareLink({
      cardId: context.req.param("cardId"),
      ownerPlayerId: context.get("player").id,
      expiresAt: body.data.expiresAt ? new Date(body.data.expiresAt) : null,
    });

    if (!result.ok) {
      return sharingErrorResponse(context, result.error, result.message);
    }

    return jsonOk(context, result.data, 201);
  });

  return routes;
}
