import { Hono } from "hono";
import { cors } from "hono/cors";

import { createAuthRoutes } from "./routes/auth.routes.js";
import { createCardRoutes } from "./routes/card.routes.js";
import { createPartnershipRoutes } from "./routes/partnership.routes.js";
import type { ApiBindings, ApiServices } from "./routes/index.js";

export function createApp(services: ApiServices): Hono<ApiBindings> {
  const app = new Hono<ApiBindings>();

  app.use("*", cors());

  app.get("/health", (context) => {
    return context.json({ status: "ok" });
  });

  app.route("/auth", createAuthRoutes(services));
  app.route("/cards", createCardRoutes(services));
  app.route("/partnerships", createPartnershipRoutes(services));

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
    console.error(error);
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
