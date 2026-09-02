import type { Context } from "hono";
import type { z } from "zod";

import { jsonError } from "./responses.js";

export type ParsedBody<T> =
  | { ok: true; data: T }
  | { ok: false; response: Response };

export async function parseJsonBody<Schema extends z.ZodType>(
  context: Context,
  schema: Schema,
): Promise<ParsedBody<z.infer<Schema>>> {
  let body: unknown;

  try {
    body = await context.req.json();
  } catch {
    return {
      ok: false,
      response: jsonError(context, 400, "INVALID_JSON", "Request body must be valid JSON."),
    };
  }

  const result = schema.safeParse(body);

  if (!result.success) {
    return {
      ok: false,
      response: jsonError(context, 422, "VALIDATION_ERROR", result.error.issues[0]?.message ?? "Invalid request body."),
    };
  }

  return {
    ok: true,
    data: result.data,
  };
}
