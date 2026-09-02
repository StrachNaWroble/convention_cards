import { Hono } from "hono";

import type { ApiBindings, ApiServices } from "./api.types.js";
import { jsonError, jsonOk } from "./responses.js";

function templateErrorResponse(context: Parameters<typeof jsonError>[0], error: string): Response {
  if (error === "TEMPLATE_NOT_FOUND") {
    return jsonError(context, 404, error, "Template was not found.");
  }

  return jsonError(context, 400, error, "Could not process template request.");
}

export function createTemplateRoutes(services: ApiServices): Hono<ApiBindings> {
  const routes = new Hono<ApiBindings>();

  routes.get("/", async (context) => {
    const result = await services.templates.listTemplates();

    if (!result.ok) {
      return templateErrorResponse(context, result.error);
    }

    return jsonOk(context, { templates: result.data });
  });

  routes.get("/:slug", async (context) => {
    const result = await services.templates.getTemplate(context.req.param("slug"));

    if (!result.ok) {
      return templateErrorResponse(context, result.error);
    }

    return jsonOk(context, result.data);
  });

  return routes;
}
