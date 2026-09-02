import { Hono } from "hono";
import { z } from "zod";

import type { ApiBindings, ApiServices } from "./api.types.js";
import { createAuthMiddleware } from "./auth.middleware.js";
import { parseJsonBody } from "./requestValidation.js";
import { jsonError, jsonOk } from "./responses.js";

const cardDataSchema = z.record(z.string(), z.unknown());

const createCardSchema = z.object({
  title: z.string().min(1).optional(),
  partnershipId: z.string().uuid().nullable().optional(),
  cardData: cardDataSchema.optional(),
});

const updateCardSchema = z.object({
  title: z.string().min(1).optional(),
  cardData: cardDataSchema.optional(),
});

function cardErrorResponse(context: Parameters<typeof jsonError>[0], error: string, message?: string): Response {
  if (error === "CARD_NOT_FOUND") {
    return jsonError(context, 404, error, "Card was not found.");
  }

  if (error === "CARD_NOT_EDITABLE") {
    return jsonError(context, 409, error, "This card cannot be edited in its current status.");
  }

  return jsonError(context, 400, error, message ?? "Could not process card request.");
}

export function createCardRoutes(services: ApiServices): Hono<ApiBindings> {
  const routes = new Hono<ApiBindings>();
  const requireAuth = createAuthMiddleware(services);

  routes.use("*", requireAuth);

  routes.get("/", async (context) => {
    const player = context.get("player");
    const result = await services.cards.listMyCards(player.id);

    if (!result.ok) {
      return cardErrorResponse(context, result.error, result.message);
    }

    return jsonOk(context, { cards: result.data });
  });

  routes.post("/", async (context) => {
    const body = await parseJsonBody(context, createCardSchema);

    if (!body.ok) {
      return body.response;
    }

    const result = await services.cards.createBlankDraft({
      ownerPlayerId: context.get("player").id,
      partnershipId: body.data.partnershipId,
      title: body.data.title,
      cardData: body.data.cardData,
    });

    if (!result.ok) {
      return cardErrorResponse(context, result.error, result.message);
    }

    return jsonOk(context, result.data, 201);
  });

  routes.get("/:cardId", async (context) => {
    const result = await services.cards.getMyCard(context.req.param("cardId"), context.get("player").id);

    if (!result.ok) {
      return cardErrorResponse(context, result.error, result.message);
    }

    return jsonOk(context, result.data);
  });

  routes.patch("/:cardId", async (context) => {
    const body = await parseJsonBody(context, updateCardSchema);

    if (!body.ok) {
      return body.response;
    }

    const result = await services.cards.autosaveDraft({
      cardId: context.req.param("cardId"),
      ownerPlayerId: context.get("player").id,
      title: body.data.title,
      cardData: body.data.cardData,
    });

    if (!result.ok) {
      return cardErrorResponse(context, result.error, result.message);
    }

    return jsonOk(context, result.data);
  });

  routes.post("/:cardId/submit-for-approval", async (context) => {
    const result = await services.cards.submitForPartnerApproval(context.req.param("cardId"), context.get("player").id);

    if (!result.ok) {
      return cardErrorResponse(context, result.error, result.message);
    }

    return jsonOk(context, result.data);
  });

  routes.post("/:cardId/archive", async (context) => {
    const result = await services.cards.archiveCard(context.req.param("cardId"), context.get("player").id);

    if (!result.ok) {
      return cardErrorResponse(context, result.error, result.message);
    }

    return jsonOk(context, result.data);
  });

  return routes;
}
