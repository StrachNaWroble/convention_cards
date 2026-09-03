import { describe, expect, it, vi } from "vitest";

import { createApp, type AppOptions } from "../../backend/src/app.js";
import type { AuthService } from "../../backend/src/auth/index.js";
import type { AuthProvider } from "../../backend/src/auth/auth.types.js";
import type { CardService } from "../../backend/src/cards/index.js";
import type { PartnershipService } from "../../backend/src/partnerships/index.js";
import type { PlayerProfileService } from "../../backend/src/players/playerProfile.service.js";
import type { Player } from "../../backend/src/players/player.types.js";
import type { AppLogger, LogFields } from "../../backend/src/observability/index.js";
import type { SharingService } from "../../backend/src/sharing/index.js";
import { ok } from "../../backend/src/shared/result.js";
import type { TemplateService } from "../../backend/src/templates/index.js";
import type { WbfVerificationService } from "../../backend/src/wbf-verification/index.js";

function buildPlayer(): Player {
  const now = new Date("2026-09-03T10:00:00.000Z");

  return {
    id: "player-1",
    authUserId: "auth-user-1",
    wbfNumber: "123456",
    email: "player@example.com",
    displayName: "Test Player",
    countryOrNbo: null,
    verificationStatus: "pending",
    verificationSource: null,
    verificationCheckedAt: null,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

function createAuthProvider(): AuthProvider {
  return {
    registerWithEmailPassword: vi.fn(),
    signInWithEmailPassword: vi.fn(),
    refreshSession: vi.fn(),
    sendPasswordResetEmail: vi.fn(async () => ok(undefined)),
    updatePassword: vi.fn(async () => ok(undefined)),
    getUserByAccessToken: vi.fn(async () => ok({ id: "auth-user-1", email: "player@example.com" })),
    signOut: vi.fn(async () => ok(undefined)),
  };
}

function createAuthService(player = buildPlayer()): AuthService {
  return {
    registerPlayerAccount: vi.fn(),
    loginWithWbfNumber: vi.fn(),
    requestPasswordReset: vi.fn(),
    changePassword: vi.fn(),
    getCurrentPlayer: vi.fn(async () => ok(player)),
  };
}

function createCardService(): CardService {
  return {
    createBlankDraft: vi.fn(),
    listMyCards: vi.fn(async () => ok([])),
    listCardsForPartnerReview: vi.fn(async () => ok([])),
    getMyCard: vi.fn(),
    validateForActivation: vi.fn(async () => ok({ valid: true, issues: [] })),
    createRevisionFromRejectedCard: vi.fn(),
    autosaveDraft: vi.fn(),
    submitForPartnerApproval: vi.fn(),
    approveCardAsPartner: vi.fn(),
    rejectCardAsPartner: vi.fn(),
    activateCard: vi.fn(),
    archiveCard: vi.fn(),
  };
}

function createPartnershipService(): PartnershipService {
  return {
    createPartnership: vi.fn(),
    listMyPartnerships: vi.fn(async () => ok([])),
    getMyPartnership: vi.fn(),
    approvePartnership: vi.fn(),
    declinePartnership: vi.fn(),
    archivePartnership: vi.fn(),
  };
}

function createPlayerProfileService(): PlayerProfileService {
  return {
    getMyProfile: vi.fn(async (player: Player) => ok(player)),
    updateMyProfile: vi.fn(),
  };
}

function createSharingService(): SharingService {
  return {
    createShareLink: vi.fn(),
    listShareLinks: vi.fn(async () => ok([])),
    revokeShareLink: vi.fn(),
    getPublicSharedCard: vi.fn(),
  };
}

function createTemplateService(): TemplateService {
  return {
    listTemplates: vi.fn(async () => ok([])),
    getTemplate: vi.fn(),
  };
}

function createWbfVerificationService(): WbfVerificationService {
  return {
    verifyWbfNumber: vi.fn(async (wbfNumber: string) => ({
      status: "unavailable" as const,
      wbfNumber,
      checkedAt: new Date("2026-09-03T10:00:00.000Z"),
      confidence: "low" as const,
    })),
  };
}

function createTestServices(overrides: Partial<{
  auth: AuthService;
  authProvider: AuthProvider;
  cards: CardService;
  partnerships: PartnershipService;
  playerProfiles: PlayerProfileService;
  sharing: SharingService;
  templates: TemplateService;
  wbfVerification: WbfVerificationService;
}> = {}) {
  return {
    auth: createAuthService(),
    authProvider: createAuthProvider(),
    cards: createCardService(),
    partnerships: createPartnershipService(),
    playerProfiles: createPlayerProfileService(),
    sharing: createSharingService(),
    templates: createTemplateService(),
    wbfVerification: createWbfVerificationService(),
    ...overrides,
  };
}

function createTestApp(options?: AppOptions) {
  return createApp(createTestServices(), options);
}

function createMemoryLogger(): AppLogger & { entries: { level: string; message: string; fields?: LogFields }[] } {
  const entries: { level: string; message: string; fields?: LogFields }[] = [];

  return {
    entries,
    debug: (message, fields) => entries.push({ level: "debug", message, fields }),
    info: (message, fields) => entries.push({ level: "info", message, fields }),
    warn: (message, fields) => entries.push({ level: "warn", message, fields }),
    error: (message, fields) => entries.push({ level: "error", message, fields }),
  };
}

describe("app CORS", () => {
  it("allows all origins by default for local development", async () => {
    const app = createTestApp();

    const response = await app.request("/health", {
      headers: {
        origin: "https://preview.example.com",
      },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("allows configured origins", async () => {
    const app = createApp(
      {
        auth: createAuthService(),
        authProvider: createAuthProvider(),
        cards: createCardService(),
        partnerships: createPartnershipService(),
        playerProfiles: createPlayerProfileService(),
        sharing: createSharingService(),
        templates: createTemplateService(),
        wbfVerification: createWbfVerificationService(),
      },
      {
        cors: {
          allowedOrigins: ["https://app.example.com"],
          allowCredentials: true,
          maxAgeSeconds: 300,
        },
      },
    );

    const response = await app.request("/health", {
      headers: {
        origin: "https://app.example.com",
      },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://app.example.com");
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBe("true");
    expect(response.headers.get("Vary")).toContain("Origin");
  });

  it("does not expose responses to unconfigured origins", async () => {
    const app = createApp(
      {
        auth: createAuthService(),
        authProvider: createAuthProvider(),
        cards: createCardService(),
        partnerships: createPartnershipService(),
        playerProfiles: createPlayerProfileService(),
        sharing: createSharingService(),
        templates: createTemplateService(),
        wbfVerification: createWbfVerificationService(),
      },
      {
        cors: {
          allowedOrigins: ["https://app.example.com"],
          allowCredentials: false,
          maxAgeSeconds: 300,
        },
      },
    );

    const response = await app.request("/health", {
      headers: {
        origin: "https://other.example.com",
      },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("responds to allowed preflight requests", async () => {
    const app = createApp(
      {
        auth: createAuthService(),
        authProvider: createAuthProvider(),
        cards: createCardService(),
        partnerships: createPartnershipService(),
        playerProfiles: createPlayerProfileService(),
        sharing: createSharingService(),
        templates: createTemplateService(),
        wbfVerification: createWbfVerificationService(),
      },
      {
        cors: {
          allowedOrigins: ["https://app.example.com"],
          allowCredentials: false,
          maxAgeSeconds: 300,
        },
      },
    );

    const response = await app.request("/auth/login", {
      method: "OPTIONS",
      headers: {
        origin: "https://app.example.com",
        "access-control-request-method": "POST",
        "access-control-request-headers": "authorization,content-type",
      },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://app.example.com");
    expect(response.headers.get("Access-Control-Allow-Headers")).toBe("Authorization,Content-Type,X-Request-Id");
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("POST");
    expect(response.headers.get("Access-Control-Allow-Methods")).not.toContain("DELETE");
    expect(response.headers.get("Access-Control-Max-Age")).toBe("300");
  });
});

describe("app request logging", () => {
  it("adds a request id and logs successful requests", async () => {
    const logger = createMemoryLogger();
    const app = createTestApp({
      logger,
      requestLogging: true,
    });

    const response = await app.request("/health", {
      headers: {
        "x-request-id": "request-1",
        "x-forwarded-for": "203.0.113.10",
      },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Request-Id")).toBe("request-1");
    expect(logger.entries).toContainEqual({
      level: "info",
      message: "http.request",
      fields: expect.objectContaining({
        requestId: "request-1",
        method: "GET",
        path: "/health",
        status: 200,
        clientIp: "203.0.113.10",
      }),
    });
  });

  it("logs client errors as warnings", async () => {
    const logger = createMemoryLogger();
    const app = createTestApp({
      logger,
      requestLogging: true,
    });

    const response = await app.request("/missing", {
      headers: {
        "x-request-id": "request-2",
      },
    });

    expect(response.status).toBe(404);
    expect(logger.entries).toContainEqual({
      level: "warn",
      message: "http.request",
      fields: expect.objectContaining({
        requestId: "request-2",
        method: "GET",
        path: "/missing",
        status: 404,
      }),
    });
  });

  it("logs internal errors with request context", async () => {
    const logger = createMemoryLogger();
    const app = createApp(
      createTestServices({
        wbfVerification: {
          verifyWbfNumber: vi.fn(async () => {
            throw new Error("WBF lookup exploded.");
          }),
        },
      }),
      {
        logger,
        requestLogging: true,
      },
    );

    const response = await app.request("/wbf-verification/verify", {
      method: "POST",
      body: JSON.stringify({ wbfNumber: "123456" }),
      headers: {
        "content-type": "application/json",
        "x-request-id": "request-3",
      },
    });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Something went wrong.",
      },
    });
    expect(logger.entries).toContainEqual({
      level: "error",
      message: "http.error",
      fields: expect.objectContaining({
        requestId: "request-3",
        method: "POST",
        path: "/wbf-verification/verify",
        errorName: "Error",
        errorMessage: "WBF lookup exploded.",
      }),
    });
    expect(logger.entries).toContainEqual({
      level: "error",
      message: "http.request",
      fields: expect.objectContaining({
        requestId: "request-3",
        status: 500,
      }),
    });
  });
});
