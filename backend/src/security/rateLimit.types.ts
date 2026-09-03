import type { MiddlewareHandler } from "hono";

export type RateLimitDecision = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
};

export type RateLimitStore = {
  consume(key: string, now: Date, windowMs: number, maxRequests: number): RateLimitDecision;
};

export type RateLimitConfig = {
  enabled: boolean;
  windowMs: number;
  authMaxRequests: number;
  passwordResetMaxRequests: number;
  wbfVerificationMaxRequests: number;
};

export type RateLimiters = {
  auth: MiddlewareHandler;
  passwordReset: MiddlewareHandler;
  wbfVerification: MiddlewareHandler;
};
