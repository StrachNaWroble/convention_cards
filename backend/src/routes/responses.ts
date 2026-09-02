import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
  };
};

export function jsonOk<T>(context: Context, data: T, status: ContentfulStatusCode = 200): Response {
  return context.json({ data }, status);
}

export function jsonError(
  context: Context,
  status: ContentfulStatusCode,
  code: string,
  message: string,
): Response {
  return context.json(
    {
      error: {
        code,
        message,
      },
    },
    status,
  );
}
