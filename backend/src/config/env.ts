import { loadCorsConfig, type AppCorsConfig } from "./cors.js";
import type { LogLevel } from "../observability/logger.js";

export type AppEnv = {
  databaseUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey?: string;
  requireWbfVerification: boolean;
  passwordResetRedirectTo?: string;
  cors: AppCorsConfig;
  rateLimitEnabled: boolean;
  rateLimitWindowMs: number;
  authRateLimitMax: number;
  passwordResetRateLimitMax: number;
  wbfVerificationRateLimitMax: number;
  logLevel: LogLevel;
  requestLoggingEnabled: boolean;
};

type EnvSource = Record<string, string | undefined>;

function requireEnv(source: EnvSource, name: string): string {
  const value = source[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function optionalPositiveInteger(source: EnvSource, name: string, defaultValue: number): number {
  const rawValue = source[name];

  if (!rawValue) {
    return defaultValue;
  }

  const value = Number(rawValue);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Environment variable ${name} must be a positive integer.`);
  }

  return value;
}

function optionalLogLevel(source: EnvSource, name: string, defaultValue: LogLevel): LogLevel {
  const rawValue = source[name];

  if (!rawValue) {
    return defaultValue;
  }

  if (rawValue === "debug" || rawValue === "info" || rawValue === "warn" || rawValue === "error") {
    return rawValue;
  }

  throw new Error(`Environment variable ${name} must be one of: debug, info, warn, error.`);
}

export function loadAppEnv(source: EnvSource = process.env): AppEnv {
  return {
    databaseUrl: requireEnv(source, "DATABASE_URL"),
    supabaseUrl: requireEnv(source, "SUPABASE_URL"),
    supabaseAnonKey: requireEnv(source, "SUPABASE_ANON_KEY"),
    supabaseServiceRoleKey: source.SUPABASE_SERVICE_ROLE_KEY,
    requireWbfVerification: source.REQUIRE_WBF_VERIFICATION === "true",
    passwordResetRedirectTo: source.PASSWORD_RESET_REDIRECT_TO,
    cors: loadCorsConfig(source),
    rateLimitEnabled: source.RATE_LIMIT_ENABLED !== "false",
    rateLimitWindowMs: optionalPositiveInteger(source, "RATE_LIMIT_WINDOW_MS", 60_000),
    authRateLimitMax: optionalPositiveInteger(source, "AUTH_RATE_LIMIT_MAX", 20),
    passwordResetRateLimitMax: optionalPositiveInteger(source, "PASSWORD_RESET_RATE_LIMIT_MAX", 5),
    wbfVerificationRateLimitMax: optionalPositiveInteger(source, "WBF_VERIFICATION_RATE_LIMIT_MAX", 30),
    logLevel: optionalLogLevel(source, "LOG_LEVEL", "info"),
    requestLoggingEnabled: source.REQUEST_LOGGING_ENABLED !== "false",
  };
}
