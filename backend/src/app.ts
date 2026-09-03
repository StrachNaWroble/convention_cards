import { Hono } from "hono";
import { cors } from "hono/cors";

import type { AppCorsConfig } from "./config/cors.js";
import { consoleLogger, createRequestLoggingMiddleware, type AppLogger } from "./observability/index.js";
import { createActivityRoutes } from "./routes/activity.routes.js";
import { createAuthRoutes } from "./routes/auth.routes.js";
import { createCardRoutes } from "./routes/card.routes.js";
import { createPartnershipRoutes } from "./routes/partnership.routes.js";
import { createPlayerRoutes } from "./routes/player.routes.js";
import { createAuthenticatedSharingRoutes, createPublicSharingRoutes } from "./routes/sharing.routes.js";
import { createTemplateRoutes } from "./routes/template.routes.js";
import { createWbfVerificationRoutes } from "./routes/wbfVerification.routes.js";
import type { ApiBindings, ApiServices } from "./routes/index.js";

export type AppOptions = {
  cors?: AppCorsConfig;
  logger?: AppLogger;
  requestLogging?: boolean;
};

const defaultCorsConfig: AppCorsConfig = {
  allowedOrigins: ["*"],
  allowCredentials: false,
  maxAgeSeconds: 600,
};

function createCorsOriginMatcher(allowedOrigins: string[]) {
  if (allowedOrigins.includes("*")) {
    return "*";
  }

  const allowedOriginSet = new Set(allowedOrigins);

  return (origin: string) => (allowedOriginSet.has(origin) ? origin : null);
}

export function createApp(services: ApiServices, options: AppOptions = {}): Hono<ApiBindings> {
  const app = new Hono<ApiBindings>();
  const corsConfig = options.cors ?? defaultCorsConfig;
  const logger = options.logger ?? consoleLogger;

  if (options.requestLogging === true) {
    app.use("*", createRequestLoggingMiddleware({ logger }));
  }

  app.use(
    "*",
    cors({
      origin: createCorsOriginMatcher(corsConfig.allowedOrigins),
      allowMethods: ["GET", "HEAD", "POST", "PATCH", "OPTIONS"],
      allowHeaders: ["Authorization", "Content-Type", "X-Request-Id"],
      exposeHeaders: ["RateLimit-Limit", "RateLimit-Remaining", "RateLimit-Reset", "Retry-After", "X-Request-Id"],
      credentials: corsConfig.allowCredentials,
      maxAge: corsConfig.maxAgeSeconds,
    }),
  );

  app.get("/health", (context) => {
    return context.json({ status: "ok" });
  });

  app.route("/activity", createActivityRoutes(services));
  app.route("/auth", createAuthRoutes(services));
  app.route("/cards", createCardRoutes(services));
  app.route("/partnerships", createPartnershipRoutes(services));
  app.route("/players", createPlayerRoutes(services));
  app.route("/share-links", createAuthenticatedSharingRoutes(services));
  app.route("/shared", createPublicSharingRoutes(services));
  app.route("/templates", createTemplateRoutes(services));
  app.route("/wbf-verification", createWbfVerificationRoutes(services));

  app.notFound((context) => {
    return context.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Route was not found.",
        },
      },
      404,
    );
  });

  app.onError((error, context) => {
    const requestId = context.var.requestId;
    logger.error("http.error", {
      requestId,
      method: context.req.method,
      path: new URL(context.req.url).pathname,
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack,
    });

    return context.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Something went wrong.",
        },
      },
      500,
    );
  });

  return app;
}
