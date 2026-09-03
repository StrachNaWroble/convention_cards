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

  it("allows all CORS origins by default for local development", () => {
    expect(loadAppEnv(buildEnv()).cors).toEqual({
      allowedOrigins: ["*"],
      allowCredentials: false,
      maxAgeSeconds: 600,
    });
  });

  it("loads specific CORS origins", () => {
    expect(
      loadAppEnv(
        buildEnv({
          CORS_ALLOWED_ORIGINS: "http://localhost:5173, https://app.example.com",
          CORS_ALLOW_CREDENTIALS: "true",
          CORS_MAX_AGE_SECONDS: "300",
        }),
      ).cors,
    ).toEqual({
      allowedOrigins: ["http://localhost:5173", "https://app.example.com"],
      allowCredentials: true,
      maxAgeSeconds: 300,
    });
  });

  it("rejects wildcard CORS origins when credentials are allowed", () => {
    expect(() =>
      loadAppEnv(
        buildEnv({
          CORS_ALLOWED_ORIGINS: "*",
          CORS_ALLOW_CREDENTIALS: "true",
        }),
      ),
    ).toThrow("CORS_ALLOW_CREDENTIALS cannot be true when CORS_ALLOWED_ORIGINS is '*'.");
  });

  it("rejects invalid CORS origins", () => {
    expect(() =>
      loadAppEnv(
        buildEnv({
          CORS_ALLOWED_ORIGINS: "https://app.example.com/path",
        }),
      ),
    ).toThrow("CORS_ALLOWED_ORIGINS contains an invalid origin: https://app.example.com/path");
  });
});
