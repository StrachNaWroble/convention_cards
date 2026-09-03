import { Hono } from "hono";
import { z } from "zod";

import type { ApiBindings, ApiServices } from "./api.types.js";
import { createAuthMiddleware } from "./auth.middleware.js";
import { jsonError, jsonOk } from "./responses.js";
import type { ActivityEntityType, ActivityEventType } from "../activity/index.js";

const activityEventTypeSchema = z.enum([
  "player.registered",
  "player.logged_in",
  "player.password_reset_requested",
  "player.password_changed",
  "partnership.created",
  "partnership.approved",
  "partnership.declined",
  "partnership.archived",
  "card.created",
  "card.revision_created",
  "card.updated",
  "card.submitted_for_approval",
  "card.approved_by_partner",
  "card.rejected_by_partner",
  "card.activated",
  "card.archived",
  "card.exported",
  "share_link.created",
  "share_link.revoked",
]);

const activityEntityTypeSchema = z.enum(["player", "partnership", "card", "share_link"]);

const activityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cardId: z.string().min(1).optional(),
  partnershipId: z.string().min(1).optional(),
  shareLinkId: z.string().min(1).optional(),
});

function parseCsvFilter<T extends string>(
  value: string | undefined,
  schema: z.ZodType<T>,
  label: string,
): { ok: true; values?: T[] } | { ok: false; message: string } {
  if (!value) {
    return { ok: true };
  }

  const values = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (values.length === 0) {
    return { ok: true };
  }

  for (const item of values) {
    if (!schema.safeParse(item).success) {
      return { ok: false, message: `Unsupported ${label} filter: ${item}.` };
    }
  }

  return { ok: true, values: values as T[] };
}

function parseActivityQuery(context: Parameters<typeof jsonError>[0]):
  | {
      ok: true;
      limit?: number;
      filters: {
        eventTypes?: ActivityEventType[];
        entityTypes?: ActivityEntityType[];
        cardId?: string;
        partnershipId?: string;
        shareLinkId?: string;
      };
    }
  | { ok: false; response: Response } {
  const result = activityQuerySchema.safeParse({
    limit: context.req.query("limit"),
    cardId: context.req.query("cardId"),
    partnershipId: context.req.query("partnershipId"),
    shareLinkId: context.req.query("shareLinkId"),
  });

  if (!result.success) {
    return {
      ok: false,
      response: jsonError(context, 422, "VALIDATION_ERROR", result.error.issues[0]?.message ?? "Invalid query."),
    };
  }

  const eventTypes = parseCsvFilter(context.req.query("eventType"), activityEventTypeSchema, "activity event type");

  if (!eventTypes.ok) {
    return {
      ok: false,
      response: jsonError(context, 422, "VALIDATION_ERROR", eventTypes.message),
    };
  }

  const entityTypes = parseCsvFilter(context.req.query("entityType"), activityEntityTypeSchema, "activity entity type");

  if (!entityTypes.ok) {
    return {
      ok: false,
      response: jsonError(context, 422, "VALIDATION_ERROR", entityTypes.message),
    };
  }

  return {
    ok: true,
    limit: result.data.limit,
    filters: {
      eventTypes: eventTypes.values,
      entityTypes: entityTypes.values,
      cardId: result.data.cardId,
      partnershipId: result.data.partnershipId,
      shareLinkId: result.data.shareLinkId,
    },
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

    const query = parseActivityQuery(context);
    if (!query.ok) {
      return query.response;
    }

    const result = await services.activity.listMyEvents(context.get("player").id, query.limit, query.filters);

    if (!result.ok) {
      return activityErrorResponse(context, result.error, result.message);
    }

    return jsonOk(context, { events: result.data });
  });

  return routes;
}
