import { Hono } from "hono";
import { z } from "zod";

import type { ApiBindings, ApiServices } from "./api.types.js";
import { createAuthMiddleware } from "./auth.middleware.js";
import { parseJsonBody } from "./requestValidation.js";
import { jsonError, jsonOk } from "./responses.js";

const createPartnershipSchema = z.object({
  partnerWbfNumber: z.string().min(1, "Partner WBF number is required."),
});

function partnershipErrorResponse(context: Parameters<typeof jsonError>[0], error: string, message?: string): Response {
  if (error === "PARTNERSHIP_NOT_FOUND") {
    return jsonError(context, 404, error, "Partnership was not found.");
  }

  if (
    error === "PARTNERSHIP_NOT_PENDING" ||
    error === "ONLY_PARTNER_CAN_APPROVE" ||
    error === "ONLY_PARTNER_CAN_DECLINE" ||
    error === "CANNOT_PARTNER_WITH_SELF"
  ) {
    return jsonError(context, 409, error, message ?? "Partnership cannot be changed this way.");
  }

  if (error === "PARTNER_WBF_NUMBER_REQUIRED") {
    return jsonError(context, 422, error, "Partner WBF number is required.");
  }

  return jsonError(context, 400, error, message ?? "Could not process partnership request.");
}

export function createPartnershipRoutes(services: ApiServices): Hono<ApiBindings> {
  const routes = new Hono<ApiBindings>();
  const requireAuth = createAuthMiddleware(services);

  routes.use("*", requireAuth);

  routes.get("/", async (context) => {
    const result = await services.partnerships.listMyPartnerships(context.get("player"));

    if (!result.ok) {
      return partnershipErrorResponse(context, result.error, result.message);
    }

    return jsonOk(context, { partnerships: result.data });
  });

  routes.post("/", async (context) => {
    const body = await parseJsonBody(context, createPartnershipSchema);

    if (!body.ok) {
      return body.response;
    }

    const player = context.get("player");
    const result = await services.partnerships.createPartnership({
      ownerPlayerId: player.id,
      ownerWbfNumber: player.wbfNumber,
      partnerWbfNumber: body.data.partnerWbfNumber,
    });

    if (!result.ok) {
      return partnershipErrorResponse(context, result.error, result.message);
    }

    return jsonOk(context, result.data, 201);
  });

  routes.get("/:partnershipId", async (context) => {
    const result = await services.partnerships.getMyPartnership(
      context.req.param("partnershipId"),
      context.get("player"),
    );

    if (!result.ok) {
      return partnershipErrorResponse(context, result.error, result.message);
    }

    return jsonOk(context, result.data);
  });

  routes.post("/:partnershipId/approve", async (context) => {
    const result = await services.partnerships.approvePartnership(
      context.req.param("partnershipId"),
      context.get("player"),
    );

    if (!result.ok) {
      return partnershipErrorResponse(context, result.error, result.message);
    }

    return jsonOk(context, result.data);
  });

  routes.post("/:partnershipId/decline", async (context) => {
    const result = await services.partnerships.declinePartnership(
      context.req.param("partnershipId"),
      context.get("player"),
    );

    if (!result.ok) {
      return partnershipErrorResponse(context, result.error, result.message);
    }

    return jsonOk(context, result.data);
  });

  routes.post("/:partnershipId/archive", async (context) => {
    const result = await services.partnerships.archivePartnership(
      context.req.param("partnershipId"),
      context.get("player"),
    );

    if (!result.ok) {
      return partnershipErrorResponse(context, result.error, result.message);
    }

    return jsonOk(context, result.data);
  });

  return routes;
}
