import type { Context, MiddlewareHandler } from "hono";
import { randomUUID } from "node:crypto";

import type { ApiBindings } from "../routes/api.types.js";
import type { AppLogger } from "./logger.js";

type RequestLoggingOptions = {
  logger: AppLogger;
  now?: () => Date;
  requestIdGenerator?: () => string;
};

function getClientIp(context: Context): string | undefined {
  const forwardedFor = context.req.header("x-forwarded-for")?.split(",")[0]?.trim();
  return context.req.header("cf-connecting-ip")?.trim() || context.req.header("x-real-ip")?.trim() || forwardedFor;
}

function getRequestPath(context: Context): string {
  return new URL(context.req.url).pathname;
}

function logLevelForStatus(status: number): "info" | "warn" | "error" {
  if (status >= 500) {
    return "error";
  }

  if (status >= 400) {
    return "warn";
  }

  return "info";
}

export function createRequestLoggingMiddleware({
  logger,
  now = () => new Date(),
  requestIdGenerator = randomUUID,
}: RequestLoggingOptions): MiddlewareHandler<ApiBindings> {
  return async (context, next) => {
    const startedAt = now();
    const requestId = context.req.header("x-request-id")?.trim() || requestIdGenerator();
    context.set("requestId", requestId);
    context.header("X-Request-Id", requestId);

    try {
      await next();
    } finally {
      const finishedAt = now();
      const durationMs = Math.max(finishedAt.getTime() - startedAt.getTime(), 0);
      const status = context.res.status;
      const level = logLevelForStatus(status);
      const player = context.var.player;

      logger[level]("http.request", {
        requestId,
        method: context.req.method,
        path: getRequestPath(context),
        status,
        durationMs,
        clientIp: getClientIp(context),
        playerId: player?.id,
      });
    }
  };
}
