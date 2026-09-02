import { describe, expect, it, vi } from "vitest";

import { createApp } from "../../../backend/src/app.js";
import type { AuthService } from "../../../backend/src/auth/auth.service.js";
import type { AuthProvider } from "../../../backend/src/auth/auth.types.js";
import type { CardService } from "../../../backend/src/cards/card.service.js";
import type { PartnershipService } from "../../../backend/src/partnerships/partnership.service.js";
import type { PlayerProfileService } from "../../../backend/src/players/playerProfile.service.js";
import type { Player } from "../../../backend/src/players/player.types.js";
import type { SharingService } from "../../../backend/src/sharing/index.js";
import { err, ok } from "../../../backend/src/shared/result.js";
import type { CardTemplate, TemplateService } from "../../../backend/src/templates/index.js";
import type { WbfVerificationService } from "../../../backend/src/wbf-verification/index.js";

function buildPlayer(): Player {
  const now = new Date("2026-09-02T10:00:00.000Z");

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

function buildTemplate(overrides: Partial<CardTemplate> = {}): CardTemplate {
  const now = new Date("2026-09-02T10:00:00.000Z");

  return {
    id: "template-1",
    slug: "blank-wbf-card",
    name: "Blank WBF Card",
    description: "Blank template",
    cardData: { meta: { format: "wbf" } },
    isSystemTemplate: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createAuthProvider(): AuthProvider {
  return {
    registerWithEmailPassword: vi.fn(),
    signInWithEmailPassword: vi.fn(),
    getUserByAccessToken: vi.fn(async () => ok({ id: "auth-user-1", email: "player@example.com" })),
    signOut: vi.fn(async () => ok(undefined)),
  };
}

function createAuthService(): AuthService {
  return {
    registerPlayerAccount: vi.fn(),
    loginWithWbfNumber: vi.fn(),
    getCurrentPlayer: vi.fn(async () => ok(buildPlayer())),
  };
}

function createCardService(): CardService {
  return {
    createBlankDraft: vi.fn(),
    listMyCards: vi.fn(async () => ok([])),
    listCardsForPartnerReview: vi.fn(async () => ok([])),
    getMyCard: vi.fn(),
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

function createWbfVerificationService(): WbfVerificationService {
  return {
    verifyWbfNumber: vi.fn(async (wbfNumber: string) => ({
      status: "unavailable" as const,
      wbfNumber,
      checkedAt: new Date("2026-09-02T10:00:00.000Z"),
      confidence: "low" as const,
    })),
  };
}

function createTemplateService(template = buildTemplate()): TemplateService {
  return {
    listTemplates: vi.fn(async () => ok([template])),
    getTemplate: vi.fn(async (slug: string) => (slug === template.slug ? ok(template) : err("TEMPLATE_NOT_FOUND"))),
  };
}

describe("template routes", () => {
  it("lists templates", async () => {
    const templates = createTemplateService();
    const app = createApp({
      auth: createAuthService(),
      authProvider: createAuthProvider(),
      cards: createCardService(),
      partnerships: createPartnershipService(),
      playerProfiles: createPlayerProfileService(),
      sharing: createSharingService(),
      templates,
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/templates");

    expect(response.status).toBe(200);
    expect(templates.listTemplates).toHaveBeenCalled();
    expect(await response.json()).toMatchObject({
      data: {
        templates: [
          {
            slug: "blank-wbf-card",
          },
        ],
      },
    });
  });

  it("loads a template by slug", async () => {
    const templates = createTemplateService();
    const app = createApp({
      auth: createAuthService(),
      authProvider: createAuthProvider(),
      cards: createCardService(),
      partnerships: createPartnershipService(),
      playerProfiles: createPlayerProfileService(),
      sharing: createSharingService(),
      templates,
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/templates/blank-wbf-card");

    expect(response.status).toBe(200);
    expect(templates.getTemplate).toHaveBeenCalledWith("blank-wbf-card");
  });

  it("returns not found for an unknown template", async () => {
    const app = createApp({
      auth: createAuthService(),
      authProvider: createAuthProvider(),
      cards: createCardService(),
      partnerships: createPartnershipService(),
      playerProfiles: createPlayerProfileService(),
      sharing: createSharingService(),
      templates: createTemplateService(),
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/templates/unknown-template");

    expect(response.status).toBe(404);
  });
});
