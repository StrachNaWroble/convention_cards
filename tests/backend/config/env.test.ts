import { describe, expect, it } from "vitest";

import { loadAppEnv } from "../../../backend/src/config/env.js";

function buildEnv(overrides: Record<string, string | undefined> = {}): Record<string, string | undefined> {
  return {
    DATABASE_URL: "postgresql://postgres:password@example.com:5432/postgres",
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_ANON_KEY: "anon-key",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    ...overrides,
  };
}

describe("environment config", () => {
  it("defaults strict WBF verification off", () => {
    expect(loadAppEnv(buildEnv()).requireWbfVerification).toBe(false);
  });

  it("enables strict WBF verification when configured", () => {
    expect(loadAppEnv(buildEnv({ REQUIRE_WBF_VERIFICATION: "true" })).requireWbfVerification).toBe(true);
  });
});
