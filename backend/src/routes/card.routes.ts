import { Hono } from "hono";
import { z } from "zod";

import type { ApiBindings, ApiServices } from "./api.types.js";
import { createAuthMiddleware } from "./auth.middleware.js";
import { parseJsonBody } from "./requestValidation.js";
import { jsonError, jsonOk } from "./responses.js";
import { createShareLinkRoutes } from "./sharing.routes.js";

const cardDataSchema = z.record(z.string(), z.unknown());

const createCardSchema = z.object({
  title: z.string().min(1).optional(),
  partnershipId: z.string().uuid().nullable().optional(),
  cardData: cardDataSchema.optional(),
});

const createCardFromTemplateSchema = z.object({
  templateSlug: z.string().min(1, "Template slug is required."),
  title: z.string().min(1).optional(),
  partnershipId: z.string().uuid().nullable().optional(),
});

const updateCardSchema = z.object({
  title: z.string().min(1).optional(),
  cardData: cardDataSchema.optional(),
});

const rejectCardReviewSchema = z.object({
  rejectionReason: z.string().max(1000).optional(),
});

function cardErrorResponse(context: Parameters<typeof jsonError>[0], error: string, message?: string): Response {
  if (error === "CARD_NOT_FOUND") {
    return jsonError(context, 404, error, "Card was not found.");
  }

  if (error === "CARD_NOT_EDITABLE") {
    return jsonError(context, 409, error, "This card cannot be edited in its current status.");
  }

  if (error === "CARD_NOT_PENDING_REVIEW") {
    return jsonError(context, 409, error, "This card is not waiting for partner review.");
  }

  if (error === "CARD_NOT_APPROVED_BY_PARTNER") {
    return jsonError(context, 409, error, "This card must be approved by the partner before activation.");
  }

  if (error === "CARD_NOT_REVISIONABLE") {
    return jsonError(context, 409, error, "Only rejected cards can be revised.");
  }

  if (error === "CARD_REVISION_ALREADY_EXISTS") {
    return jsonError(context, 409, error, "This rejected card already has an open draft revision.");
  }

  if (error === "CARD_NOT_READY_FOR_ACTIVATION" || error === "PARTNERSHIP_NOT_APPROVED") {
    return jsonError(context, 409, error, message ?? "This card is not ready for activation.");
  }

  if (error === "REJECTION_REASON_TOO_LONG") {
    return jsonError(context, 422, error, message ?? "Rejection reason is too long.");
  }

  return jsonError(context, 400, error, message ?? "Could not process card request.");
}

export function createCardRoutes(services: ApiServices): Hono<ApiBindings> {
  const routes = new Hono<ApiBindings>();
  const requireAuth = createAuthMiddleware(services);

  routes.route("/", createShareLinkRoutes(services));

  routes.use("*", requireAuth);

  routes.get("/", async (context) => {
    const player = context.get("player");
    const result = await services.cards.listMyCards(player.id);

    if (!result.ok) {
      return cardErrorResponse(context, result.error, result.message);
    }

    return jsonOk(context, { cards: result.data });
  });

  routes.get("/reviews/pending", async (context) => {
    const result = await services.cards.listCardsForPartnerReview(context.get("player"));

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

  routes.post("/from-template", async (context) => {
    const body = await parseJsonBody(context, createCardFromTemplateSchema);

    if (!body.ok) {
      return body.response;
    }

    const template = await services.templates.getTemplate(body.data.templateSlug);

    if (!template.ok) {
      return jsonError(context, 404, template.error, "Template was not found.");
    }

    const result = await services.cards.createBlankDraft({
      ownerPlayerId: context.get("player").id,
      partnershipId: body.data.partnershipId,
      title: body.data.title ?? template.data.name,
      cardData: template.data.cardData,
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

  routes.post("/:cardId/revisions", async (context) => {
    const result = await services.cards.createRevisionFromRejectedCard(
      context.req.param("cardId"),
      context.get("player").id,
    );

    if (!result.ok) {
      return cardErrorResponse(context, result.error, result.message);
    }

    return jsonOk(context, result.data, 201);
  });

  routes.post("/:cardId/submit-for-approval", async (context) => {
    const result = await services.cards.submitForPartnerApproval(context.req.param("cardId"), context.get("player").id);

    if (!result.ok) {
      return cardErrorResponse(context, result.error, result.message);
    }

    return jsonOk(context, result.data);
  });

  routes.post("/:cardId/review/approve", async (context) => {
    const result = await services.cards.approveCardAsPartner(context.req.param("cardId"), context.get("player"));

    if (!result.ok) {
      return cardErrorResponse(context, result.error, result.message);
    }

    return jsonOk(context, result.data);
  });

  routes.post("/:cardId/review/reject", async (context) => {
    const body = await parseJsonBody(context, rejectCardReviewSchema);

    if (!body.ok) {
      return body.response;
    }

    const result = await services.cards.rejectCardAsPartner(
      context.req.param("cardId"),
      context.get("player"),
      body.data.rejectionReason,
    );

    if (!result.ok) {
      return cardErrorResponse(context, result.error, result.message);
    }

    return jsonOk(context, result.data);
  });

  routes.post("/:cardId/activate", async (context) => {
    const result = await services.cards.activateCard(context.req.param("cardId"), context.get("player").id);

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
