import { Hono } from "hono";
import { z } from "zod";

import type { ApiBindings, ApiServices } from "./api.types.js";
import { createAuthMiddleware } from "./auth.middleware.js";
import { parseJsonBody } from "./requestValidation.js";
import { jsonError, jsonOk } from "./responses.js";

const registerSchema = z.object({
  wbfNumber: z.string().min(1, "WBF number is required."),
  email: z.string().email("A valid email is required."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  displayName: z.string().min(1).optional(),
  countryOrNbo: z.string().min(1).optional(),
});

const loginSchema = z.object({
  wbfNumber: z.string().min(1, "WBF number is required."),
  password: z.string().min(1, "Password is required."),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required."),
});

const passwordResetSchema = z.object({
  wbfNumber: z.string().min(1, "WBF number is required."),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: z.string().min(8, "New password must be at least 8 characters."),
});

export function createAuthRoutes(services: ApiServices): Hono<ApiBindings> {
  const routes = new Hono<ApiBindings>();

  routes.post("/register", async (context) => {
    const body = await parseJsonBody(context, registerSchema);

    if (!body.ok) {
      return body.response;
    }

    const result = await services.auth.registerPlayerAccount(body.data);

    if (!result.ok) {
      if (result.error === "WBF_NUMBER_ALREADY_REGISTERED") {
        return jsonError(context, 409, result.error, "This WBF number is already registered.");
      }

      if (result.error === "EMAIL_ALREADY_REGISTERED") {
        return jsonError(context, 409, result.error, "This email is already registered.");
      }

      if (result.error === "WBF_NUMBER_NOT_FOUND") {
        return jsonError(context, 422, result.error, "This WBF number could not be found.");
      }

      if (result.error === "WBF_VERIFICATION_UNAVAILABLE") {
        return jsonError(context, 503, result.error, "WBF verification is temporarily unavailable.");
      }

      return jsonError(context, 400, result.error, result.message ?? "Could not register player account.");
    }

    return jsonOk(context, result.data, 201);
  });

  routes.post("/login", async (context) => {
    const body = await parseJsonBody(context, loginSchema);

    if (!body.ok) {
      return body.response;
    }

    const result = await services.auth.loginWithWbfNumber(body.data);

    if (!result.ok) {
      return jsonError(context, 401, result.error, "Invalid WBF number or password.");
    }

    return jsonOk(context, result.data);
  });

  routes.post("/refresh", async (context) => {
    const body = await parseJsonBody(context, refreshSchema);

    if (!body.ok) {
      return body.response;
    }

    const result = await services.authProvider.refreshSession(body.data.refreshToken);

    if (!result.ok) {
      return jsonError(context, 401, result.error, "Invalid or expired refresh token.");
    }

    return jsonOk(context, { session: result.data });
  });

  routes.post("/password-reset", async (context) => {
    const body = await parseJsonBody(context, passwordResetSchema);

    if (!body.ok) {
      return body.response;
    }

    const result = await services.auth.requestPasswordReset(body.data);

    if (!result.ok) {
      return jsonError(context, 400, result.error, result.message ?? "Could not request password reset.");
    }

    return jsonOk(context, result.data);
  });

  routes.patch("/password", createAuthMiddleware(services), async (context) => {
    const body = await parseJsonBody(context, changePasswordSchema);

    if (!body.ok) {
      return body.response;
    }

    const player = context.get("player");
    const result = await services.auth.changePassword({
      playerId: player.id,
      authUserId: player.authUserId,
      email: player.email,
      currentPassword: body.data.currentPassword,
      newPassword: body.data.newPassword,
    });

    if (!result.ok) {
      if (result.error === "INVALID_CREDENTIALS") {
        return jsonError(context, 401, result.error, "Current password is incorrect.");
      }

      return jsonError(context, 400, result.error, result.message ?? "Could not change password.");
    }

    return jsonOk(context, result.data);
  });

  routes.post("/logout", createAuthMiddleware(services), async (context) => {
    const result = await services.authProvider.signOut(context.get("accessToken"));

    if (!result.ok) {
      return jsonError(context, 400, result.error, result.message ?? "Could not sign out.");
    }

    return jsonOk(context, { signedOut: true });
  });

  routes.get("/me", createAuthMiddleware(services), (context) => {
    return jsonOk(context, { player: context.get("player") });
  });

  return routes;
}
