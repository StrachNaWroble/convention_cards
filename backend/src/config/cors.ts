export type AppCorsConfig = {
  allowedOrigins: string[];
  allowCredentials: boolean;
  maxAgeSeconds: number;
};

export type CorsEnvSource = Record<string, string | undefined>;

const DEFAULT_ALLOWED_ORIGINS = ["*"];
const DEFAULT_MAX_AGE_SECONDS = 600;

function parsePositiveInteger(source: CorsEnvSource, name: string, defaultValue: number): number {
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

function assertValidAllowedOrigin(origin: string): void {
  if (origin === "*") {
    return;
  }

  let parsed: URL;

  try {
    parsed = new URL(origin);
  } catch {
    throw new Error(`CORS_ALLOWED_ORIGINS contains an invalid origin: ${origin}`);
  }

  if (!["http:", "https:"].includes(parsed.protocol) || parsed.origin !== origin) {
    throw new Error(`CORS_ALLOWED_ORIGINS contains an invalid origin: ${origin}`);
  }
}

export function parseAllowedOrigins(source: CorsEnvSource): string[] {
  const rawValue = source.CORS_ALLOWED_ORIGINS;

  if (!rawValue) {
    return DEFAULT_ALLOWED_ORIGINS;
  }

  const origins = rawValue
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (!origins.length) {
    throw new Error("CORS_ALLOWED_ORIGINS must include at least one origin.");
  }

  if (origins.includes("*") && origins.length > 1) {
    throw new Error("CORS_ALLOWED_ORIGINS cannot combine '*' with specific origins.");
  }

  origins.forEach(assertValidAllowedOrigin);

  return origins;
}

export function loadCorsConfig(source: CorsEnvSource): AppCorsConfig {
  const allowedOrigins = parseAllowedOrigins(source);
  const allowCredentials = source.CORS_ALLOW_CREDENTIALS === "true";

  if (allowCredentials && allowedOrigins.includes("*")) {
    throw new Error("CORS_ALLOW_CREDENTIALS cannot be true when CORS_ALLOWED_ORIGINS is '*'.");
  }

  return {
    allowedOrigins,
    allowCredentials,
    maxAgeSeconds: parsePositiveInteger(source, "CORS_MAX_AGE_SECONDS", DEFAULT_MAX_AGE_SECONDS),
  };
}
