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

  it("loads the optional password reset redirect URL", () => {
    expect(
      loadAppEnv(buildEnv({ PASSWORD_RESET_REDIRECT_TO: "https://app.example.com/reset-password" }))
        .passwordResetRedirectTo,
    ).toBe("https://app.example.com/reset-password");
  });

  it("loads rate limit defaults", () => {
    expect(loadAppEnv(buildEnv())).toMatchObject({
      rateLimitEnabled: true,
      rateLimitWindowMs: 60_000,
      authRateLimitMax: 20,
      passwordResetRateLimitMax: 5,
      wbfVerificationRateLimitMax: 30,
    });
  });

  it("allows rate limiting to be disabled", () => {
    expect(loadAppEnv(buildEnv({ RATE_LIMIT_ENABLED: "false" })).rateLimitEnabled).toBe(false);
  });

  it("loads custom rate limit values", () => {
    expect(
      loadAppEnv(
        buildEnv({
          RATE_LIMIT_WINDOW_MS: "30000",
          AUTH_RATE_LIMIT_MAX: "8",
          PASSWORD_RESET_RATE_LIMIT_MAX: "3",
          WBF_VERIFICATION_RATE_LIMIT_MAX: "12",
        }),
      ),
    ).toMatchObject({
      rateLimitWindowMs: 30_000,
      authRateLimitMax: 8,
      passwordResetRateLimitMax: 3,
      wbfVerificationRateLimitMax: 12,
    });
  });

  it("rejects invalid rate limit values", () => {
    expect(() => loadAppEnv(buildEnv({ AUTH_RATE_LIMIT_MAX: "0" }))).toThrow(
      "Environment variable AUTH_RATE_LIMIT_MAX must be a positive integer.",
    );
  });

  it("loads observability defaults", () => {
    expect(loadAppEnv(buildEnv())).toMatchObject({
      maxRequestBodyBytes: 1_000_000,
      logLevel: "info",
      requestLoggingEnabled: true,
    });
  });

  it("loads custom observability config", () => {
    expect(
      loadAppEnv(
        buildEnv({
          LOG_LEVEL: "warn",
          MAX_REQUEST_BODY_BYTES: "2048",
          REQUEST_LOGGING_ENABLED: "false",
        }),
      ),
    ).toMatchObject({
      logLevel: "warn",
      maxRequestBodyBytes: 2048,
      requestLoggingEnabled: false,
    });
  });

  it("rejects invalid log levels", () => {
    expect(() => loadAppEnv(buildEnv({ LOG_LEVEL: "verbose" }))).toThrow(
      "Environment variable LOG_LEVEL must be one of: debug, info, warn, error.",
    );
  });

  it("rejects invalid request body size config", () => {
    expect(() => loadAppEnv(buildEnv({ MAX_REQUEST_BODY_BYTES: "-1" }))).toThrow(
      "Environment variable MAX_REQUEST_BODY_BYTES must be a positive integer.",
    );
  });
});
