import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { z } from "zod";

import type { ApiBindings, ApiServices } from "./api.types.js";
import { parseJsonBody } from "./requestValidation.js";
import { jsonOk } from "./responses.js";

const verifySchema = z.object({
  wbfNumber: z.string().min(1, "WBF number is required."),
});

export function createWbfVerificationRoutes(services: ApiServices): Hono<ApiBindings> {
  const routes = new Hono<ApiBindings>();
  const passThroughRateLimit: MiddlewareHandler<ApiBindings> = async (_context, next) => next();
  const wbfVerificationRateLimit = services.rateLimits?.wbfVerification ?? passThroughRateLimit;

  routes.post("/verify", wbfVerificationRateLimit, async (context) => {
    const body = await parseJsonBody(context, verifySchema);

    if (!body.ok) {
      return body.response;
    }

    const result = await services.wbfVerification.verifyWbfNumber(body.data.wbfNumber);

    return jsonOk(context, result);
  });

  return routes;
}
