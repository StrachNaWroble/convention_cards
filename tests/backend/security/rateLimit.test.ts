import { describe, expect, it } from "vitest";

import { createInMemoryRateLimitStore } from "../../../backend/src/security/index.js";

describe("rate limit store", () => {
  it("allows requests until the window limit is exceeded", () => {
    const store = createInMemoryRateLimitStore();
    const now = new Date("2026-09-03T10:00:00.000Z");

    expect(store.consume("login:127.0.0.1", now, 60_000, 2)).toMatchObject({
      allowed: true,
      limit: 2,
      remaining: 1,
    });
    expect(store.consume("login:127.0.0.1", now, 60_000, 2)).toMatchObject({
      allowed: true,
      remaining: 0,
    });
    expect(store.consume("login:127.0.0.1", now, 60_000, 2)).toMatchObject({
      allowed: false,
      remaining: 0,
    });
  });

  it("starts a new window after the previous one expires", () => {
    const store = createInMemoryRateLimitStore();

    store.consume("login:127.0.0.1", new Date("2026-09-03T10:00:00.000Z"), 60_000, 1);
    const limited = store.consume("login:127.0.0.1", new Date("2026-09-03T10:00:30.000Z"), 60_000, 1);
    const reset = store.consume("login:127.0.0.1", new Date("2026-09-03T10:01:01.000Z"), 60_000, 1);

    expect(limited.allowed).toBe(false);
    expect(reset).toMatchObject({
      allowed: true,
      remaining: 0,
    });
  });
});
