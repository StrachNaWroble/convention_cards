import type { Context, MiddlewareHandler } from "hono";

import { jsonError } from "../routes/responses.js";
import { createInMemoryRateLimitStore } from "./rateLimit.store.js";
import type { RateLimitConfig, RateLimiters, RateLimitStore } from "./rateLimit.types.js";

type RateLimitMiddlewareConfig = {
  name: string;
  windowMs: number;
  maxRequests: number;
  store: RateLimitStore;
  now?: () => Date;
  keyGenerator?: (context: Context) => string;
};

const passThrough: MiddlewareHandler = async (_context, next) => next();

export function getClientIp(context: Context): string {
  const forwardedFor = context.req.header("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    context.req.header("cf-connecting-ip")?.trim() ||
    context.req.header("x-real-ip")?.trim() ||
    forwardedFor ||
    "unknown"
  );
}

export function createRateLimitMiddleware({
  name,
  windowMs,
  maxRequests,
  store,
  now = () => new Date(),
  keyGenerator = getClientIp,
}: RateLimitMiddlewareConfig): MiddlewareHandler {
  return async (context, next) => {
    const key = `${name}:${keyGenerator(context)}`;
    const decision = store.consume(key, now(), windowMs, maxRequests);
    const resetSeconds = Math.ceil(decision.resetAt.getTime() / 1000);

    context.header("RateLimit-Limit", String(decision.limit));
    context.header("RateLimit-Remaining", String(decision.remaining));
    context.header("RateLimit-Reset", String(resetSeconds));

    if (!decision.allowed) {
      const retryAfterSeconds = Math.max(Math.ceil((decision.resetAt.getTime() - now().getTime()) / 1000), 1);
      context.header("Retry-After", String(retryAfterSeconds));

      return jsonError(context, 429, "RATE_LIMIT_EXCEEDED", "Too many requests. Please try again later.");
    }

    return next();
  };
}

export function createAppRateLimiters(
  config: RateLimitConfig,
  store: RateLimitStore = createInMemoryRateLimitStore(),
): RateLimiters {
  if (!config.enabled) {
    return {
      auth: passThrough,
      passwordReset: passThrough,
      wbfVerification: passThrough,
    };
  }

  return {
    auth: createRateLimitMiddleware({
      name: "auth",
      windowMs: config.windowMs,
      maxRequests: config.authMaxRequests,
      store,
    }),
    passwordReset: createRateLimitMiddleware({
      name: "password-reset",
      windowMs: config.windowMs,
      maxRequests: config.passwordResetMaxRequests,
      store,
    }),
    wbfVerification: createRateLimitMiddleware({
      name: "wbf-verification",
      windowMs: config.windowMs,
      maxRequests: config.wbfVerificationMaxRequests,
      store,
    }),
  };
}
