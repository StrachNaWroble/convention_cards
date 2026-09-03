import type { RateLimitDecision, RateLimitStore } from "./rateLimit.types.js";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

export function createInMemoryRateLimitStore(maxKeys = 10_000): RateLimitStore {
  const entries = new Map<string, RateLimitEntry>();

  function deleteExpired(nowMs: number): void {
    for (const [key, entry] of entries) {
      if (entry.resetAt <= nowMs) {
        entries.delete(key);
      }
    }
  }

  return {
    consume(key, now, windowMs, maxRequests): RateLimitDecision {
      const nowMs = now.getTime();

      if (entries.size > maxKeys) {
        deleteExpired(nowMs);
      }

      const existing = entries.get(key);
      const entry =
        existing && existing.resetAt > nowMs
          ? existing
          : {
              count: 0,
              resetAt: nowMs + windowMs,
            };

      entry.count += 1;
      entries.set(key, entry);

      return {
        allowed: entry.count <= maxRequests,
        limit: maxRequests,
        remaining: Math.max(maxRequests - entry.count, 0),
        resetAt: new Date(entry.resetAt),
      };
    },
  };
}
