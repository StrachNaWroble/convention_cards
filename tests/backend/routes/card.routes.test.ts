import { describe, expect, it, vi } from "vitest";

import { createApp } from "../../../backend/src/app.js";
import type { AuthService } from "../../../backend/src/auth/auth.service.js";
import type { AuthProvider } from "../../../backend/src/auth/auth.types.js";
import type { CardService } from "../../../backend/src/cards/card.service.js";
import type { ConventionCard } from "../../../backend/src/cards/card.types.js";
import type { CardExportService } from "../../../backend/src/exports/index.js";
import type { PartnershipService } from "../../../backend/src/partnerships/partnership.service.js";
import type { PlayerProfileService } from "../../../backend/src/players/playerProfile.service.js";
import type { Player } from "../../../backend/src/players/player.types.js";
import type { SharingService } from "../../../backend/src/sharing/index.js";
import { err, ok } from "../../../backend/src/shared/result.js";
import type { TemplateService } from "../../../backend/src/templates/index.js";
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

function buildCard(overrides: Partial<ConventionCard> = {}): ConventionCard {
  const now = new Date("2026-09-02T10:00:00.000Z");

  return {
    id: "card-1",
    ownerPlayerId: "player-1",
    partnershipId: null,
    sourceCardId: null,
    revisionNumber: 1,
    title: "Untitled card",
    status: "draft",
    cardData: {},
    submittedAt: null,
    partnerReviewedByPlayerId: null,
    partnerReviewedAt: null,
    partnerRejectionReason: null,
    activatedAt: null,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
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

function createCardService(card = buildCard()): CardService {
  return {
    createBlankDraft: vi.fn(async () => ok(card)),
    listMyCards: vi.fn(async () => ok([card])),
    listCardsForPartnerReview: vi.fn(async () => ok([buildCard({ status: "pending_partner_approval" })])),
    getMyCard: vi.fn(async () => ok(card)),
    validateForActivation: vi.fn(async () => ok({ valid: true, issues: [] })),
    createRevisionFromRejectedCard: vi.fn(async () =>
      ok(buildCard({ ...card, id: "card-2", sourceCardId: card.id, revisionNumber: card.revisionNumber + 1 })),
    ),
    autosaveDraft: vi.fn(async () => ok(card)),
    submitForPartnerApproval: vi.fn(async () => ok(buildCard({ ...card, status: "pending_partner_approval" }))),
    approveCardAsPartner: vi.fn(async () => ok(buildCard({ ...card, status: "partner_approved" }))),
    rejectCardAsPartner: vi.fn(async () =>
      ok(buildCard({ ...card, status: "partner_rejected", partnerRejectionReason: "Please check leads." })),
    ),
    activateCard: vi.fn(async () => ok(buildCard({ ...card, status: "active" }))),
    archiveCard: vi.fn(async () => ok(buildCard({ ...card, status: "archived" }))),
  };
}

function createExportService(): CardExportService {
  return {
    prepareOwnedCardExport: vi.fn(async () =>
      ok({
        export: {
          kind: "wbf-convention-card" as const,
          format: "json" as const,
          version: 1 as const,
          generatedAt: "2026-09-03T08:00:00.000Z",
        },
        layout: {
          profile: "wbf-two-page" as const,
          pageCount: 2 as const,
        },
        owner: {
          playerId: "player-1",
          wbfNumber: "123456",
          displayName: "Test Player",
          countryOrNbo: null,
        },
        card: {
          id: "card-1",
          title: "Untitled card",
          revisionNumber: 1,
          status: "active",
          cardData: { openings: { oneClub: "2+" } },
          activatedAt: new Date("2026-09-02T10:00:00.000Z"),
          updatedAt: new Date("2026-09-02T10:00:00.000Z"),
        },
      }),
    ),
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

function createTemplateService(): TemplateService {
  return {
    listTemplates: vi.fn(async () => ok([])),
    getTemplate: vi.fn(async () =>
      ok({
        id: "template-1",
        slug: "blank-wbf-card",
        name: "Blank WBF Card",
        description: "Blank template",
        cardData: { meta: { format: "wbf" } },
        isSystemTemplate: true,
        createdAt: new Date("2026-09-02T10:00:00.000Z"),
        updatedAt: new Date("2026-09-02T10:00:00.000Z"),
      }),
    ),
  };
}

function createSharingService(): SharingService {
  return {
    createShareLink: vi.fn(async () =>
      ok({
        link: {
          id: "share-link-1",
          cardId: "card-1",
          expiresAt: null,
          revokedAt: null,
          createdAt: new Date("2026-09-02T10:00:00.000Z"),
        },
        token: "raw-share-token",
      }),
    ),
    listShareLinks: vi.fn(async () =>
      ok([
        {
          id: "share-link-1",
          cardId: "card-1",
          expiresAt: null,
          revokedAt: null,
          createdAt: new Date("2026-09-02T10:00:00.000Z"),
        },
      ]),
    ),
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

describe("card routes", () => {
  it("requires authentication", async () => {
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

    const response = await app.request("/cards");

    expect(response.status).toBe(401);
  });

  it("lists the signed-in player's cards", async () => {
    const cards = createCardService();
    const app = createApp({
      auth: createAuthService(),
      authProvider: createAuthProvider(),
      cards,
      partnerships: createPartnershipService(),
      playerProfiles: createPlayerProfileService(),
      sharing: createSharingService(),
      templates: createTemplateService(),
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/cards", {
      headers: {
        authorization: "Bearer access-token",
      },
    });

    expect(response.status).toBe(200);
    expect(cards.listMyCards).toHaveBeenCalledWith("player-1", {
      includeArchived: false,
      statuses: undefined,
    });
  });

  it("passes card list filters to the card service", async () => {
    const cards = createCardService();
    const app = createApp({
      auth: createAuthService(),
      authProvider: createAuthProvider(),
      cards,
      partnerships: createPartnershipService(),
      playerProfiles: createPlayerProfileService(),
      sharing: createSharingService(),
      templates: createTemplateService(),
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/cards?status=draft,active&includeArchived=true", {
      headers: {
        authorization: "Bearer access-token",
      },
    });

    expect(response.status).toBe(200);
    expect(cards.listMyCards).toHaveBeenCalledWith("player-1", {
      includeArchived: true,
      statuses: ["draft", "active"],
    });
  });

  it("rejects unsupported card list status filters", async () => {
    const cards = createCardService();
    const app = createApp({
      auth: createAuthService(),
      authProvider: createAuthProvider(),
      cards,
      partnerships: createPartnershipService(),
      playerProfiles: createPlayerProfileService(),
      sharing: createSharingService(),
      templates: createTemplateService(),
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/cards?status=deleted", {
      headers: {
        authorization: "Bearer access-token",
      },
    });

    expect(response.status).toBe(422);
    expect(cards.listMyCards).not.toHaveBeenCalled();
  });

  it("creates a blank draft for the signed-in player", async () => {
    const cards = createCardService();
    const app = createApp({
      auth: createAuthService(),
      authProvider: createAuthProvider(),
      cards,
      partnerships: createPartnershipService(),
      playerProfiles: createPlayerProfileService(),
      sharing: createSharingService(),
      templates: createTemplateService(),
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/cards", {
      method: "POST",
      body: JSON.stringify({
        title: "2/1 with Alex",
        cardData: {
          openings: {
            oneClub: "2+",
          },
        },
      }),
      headers: {
        authorization: "Bearer access-token",
        "content-type": "application/json",
      },
    });

    expect(response.status).toBe(201);
    expect(cards.createBlankDraft).toHaveBeenCalledWith({
      ownerPlayerId: "player-1",
      partnershipId: undefined,
      title: "2/1 with Alex",
      cardData: {
        openings: {
          oneClub: "2+",
        },
      },
    });
  });

  it("creates a draft from a template for the signed-in player", async () => {
    const cards = createCardService();
    const templates = createTemplateService();
    const app = createApp({
      auth: createAuthService(),
      authProvider: createAuthProvider(),
      cards,
      partnerships: createPartnershipService(),
      playerProfiles: createPlayerProfileService(),
      sharing: createSharingService(),
      templates,
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/cards/from-template", {
      method: "POST",
      body: JSON.stringify({
        templateSlug: "blank-wbf-card",
        title: "Card from template",
      }),
      headers: {
        authorization: "Bearer access-token",
        "content-type": "application/json",
      },
    });

    expect(response.status).toBe(201);
    expect(templates.getTemplate).toHaveBeenCalledWith("blank-wbf-card");
    expect(cards.createBlankDraft).toHaveBeenCalledWith({
      ownerPlayerId: "player-1",
      partnershipId: undefined,
      title: "Card from template",
      cardData: { meta: { format: "wbf" } },
    });
  });

  it("maps non-editable draft saves to a conflict response", async () => {
    const cards = createCardService();
    vi.mocked(cards.autosaveDraft).mockResolvedValueOnce(err("CARD_NOT_EDITABLE"));
    const app = createApp({
      auth: createAuthService(),
      authProvider: createAuthProvider(),
      cards,
      partnerships: createPartnershipService(),
      playerProfiles: createPlayerProfileService(),
      sharing: createSharingService(),
      templates: createTemplateService(),
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/cards/card-1", {
      method: "PATCH",
      body: JSON.stringify({
        title: "Updated title",
      }),
      headers: {
        authorization: "Bearer access-token",
        "content-type": "application/json",
      },
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: {
        code: "CARD_NOT_EDITABLE",
        message: "This card cannot be edited in its current status.",
      },
    });
  });

  it("returns validation issues for an owned card", async () => {
    const cards = createCardService();
    vi.mocked(cards.validateForActivation).mockResolvedValueOnce(
      ok({
        valid: false,
        issues: [
          {
            code: "CARD_PARTNERSHIP_REQUIRED",
            path: "partnershipId",
            message: "Card must be linked to a partnership before activation.",
          },
        ],
      }),
    );
    const app = createApp({
      auth: createAuthService(),
      authProvider: createAuthProvider(),
      cards,
      partnerships: createPartnershipService(),
      playerProfiles: createPlayerProfileService(),
      sharing: createSharingService(),
      templates: createTemplateService(),
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/cards/card-1/validation", {
      headers: {
        authorization: "Bearer access-token",
      },
    });

    expect(response.status).toBe(200);
    expect(cards.validateForActivation).toHaveBeenCalledWith("card-1", "player-1");
    expect(await response.json()).toEqual({
      data: {
        validation: {
          valid: false,
          issues: [
            {
              code: "CARD_PARTNERSHIP_REQUIRED",
              path: "partnershipId",
              message: "Card must be linked to a partnership before activation.",
            },
          ],
        },
      },
    });
  });

  it("creates a draft revision from a rejected owned card", async () => {
    const cards = createCardService();
    const app = createApp({
      auth: createAuthService(),
      authProvider: createAuthProvider(),
      cards,
      partnerships: createPartnershipService(),
      playerProfiles: createPlayerProfileService(),
      sharing: createSharingService(),
      templates: createTemplateService(),
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/cards/card-1/revisions", {
      method: "POST",
      headers: {
        authorization: "Bearer access-token",
      },
    });

    expect(response.status).toBe(201);
    expect(cards.createRevisionFromRejectedCard).toHaveBeenCalledWith("card-1", "player-1");
    expect(await response.json()).toMatchObject({
      data: {
        id: "card-2",
        sourceCardId: "card-1",
        revisionNumber: 2,
        status: "draft",
      },
    });
  });

  it("maps duplicate draft revision requests to a conflict response", async () => {
    const cards = createCardService();
    vi.mocked(cards.createRevisionFromRejectedCard).mockResolvedValueOnce(err("CARD_REVISION_ALREADY_EXISTS"));
    const app = createApp({
      auth: createAuthService(),
      authProvider: createAuthProvider(),
      cards,
      partnerships: createPartnershipService(),
      playerProfiles: createPlayerProfileService(),
      sharing: createSharingService(),
      templates: createTemplateService(),
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/cards/card-1/revisions", {
      method: "POST",
      headers: {
        authorization: "Bearer access-token",
      },
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: {
        code: "CARD_REVISION_ALREADY_EXISTS",
        message: "This rejected card already has an open draft revision.",
      },
    });
  });

  it("lists cards waiting for this partner's review", async () => {
    const cards = createCardService();
    const app = createApp({
      auth: createAuthService(),
      authProvider: createAuthProvider(),
      cards,
      partnerships: createPartnershipService(),
      playerProfiles: createPlayerProfileService(),
      sharing: createSharingService(),
      templates: createTemplateService(),
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/cards/reviews/pending", {
      headers: {
        authorization: "Bearer access-token",
      },
    });

    expect(response.status).toBe(200);
    expect(cards.listCardsForPartnerReview).toHaveBeenCalledWith(buildPlayer());
  });

  it("approves a submitted card as the partner", async () => {
    const cards = createCardService();
    const app = createApp({
      auth: createAuthService(),
      authProvider: createAuthProvider(),
      cards,
      partnerships: createPartnershipService(),
      playerProfiles: createPlayerProfileService(),
      sharing: createSharingService(),
      templates: createTemplateService(),
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/cards/card-1/review/approve", {
      method: "POST",
      headers: {
        authorization: "Bearer access-token",
      },
    });

    expect(response.status).toBe(200);
    expect(cards.approveCardAsPartner).toHaveBeenCalledWith("card-1", buildPlayer());
  });

  it("rejects a submitted card as the partner", async () => {
    const cards = createCardService();
    const app = createApp({
      auth: createAuthService(),
      authProvider: createAuthProvider(),
      cards,
      partnerships: createPartnershipService(),
      playerProfiles: createPlayerProfileService(),
      sharing: createSharingService(),
      templates: createTemplateService(),
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/cards/card-1/review/reject", {
      method: "POST",
      body: JSON.stringify({ rejectionReason: "Please check leads." }),
      headers: {
        authorization: "Bearer access-token",
        "content-type": "application/json",
      },
    });

    expect(response.status).toBe(200);
    expect(cards.rejectCardAsPartner).toHaveBeenCalledWith("card-1", buildPlayer(), "Please check leads.");
  });

  it("activates a submitted and approved card", async () => {
    const cards = createCardService();
    const app = createApp({
      auth: createAuthService(),
      authProvider: createAuthProvider(),
      cards,
      partnerships: createPartnershipService(),
      playerProfiles: createPlayerProfileService(),
      sharing: createSharingService(),
      templates: createTemplateService(),
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/cards/card-1/activate", {
      method: "POST",
      headers: {
        authorization: "Bearer access-token",
      },
    });

    expect(response.status).toBe(200);
    expect(cards.activateCard).toHaveBeenCalledWith("card-1", "player-1");
  });

  it("returns a print-ready export payload for an owned card", async () => {
    const exports = createExportService();
    const app = createApp({
      auth: createAuthService(),
      authProvider: createAuthProvider(),
      cards: createCardService(),
      exports,
      partnerships: createPartnershipService(),
      playerProfiles: createPlayerProfileService(),
      sharing: createSharingService(),
      templates: createTemplateService(),
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/cards/card-1/export", {
      headers: {
        authorization: "Bearer access-token",
      },
    });

    expect(response.status).toBe(200);
    expect(exports.prepareOwnedCardExport).toHaveBeenCalledWith("card-1", buildPlayer());
    expect(await response.json()).toMatchObject({
      data: {
        export: {
          kind: "wbf-convention-card",
          format: "json",
          version: 1,
        },
        layout: {
          profile: "wbf-two-page",
          pageCount: 2,
        },
        owner: {
          playerId: "player-1",
          wbfNumber: "123456",
        },
        card: {
          id: "card-1",
          status: "active",
          cardData: { openings: { oneClub: "2+" } },
        },
      },
    });
  });

  it("maps non-exportable cards to a conflict response", async () => {
    const exports = createExportService();
    vi.mocked(exports.prepareOwnedCardExport).mockResolvedValueOnce(
      err("CARD_NOT_EXPORTABLE", "Only active convention cards can be exported."),
    );
    const app = createApp({
      auth: createAuthService(),
      authProvider: createAuthProvider(),
      cards: createCardService(),
      exports,
      partnerships: createPartnershipService(),
      playerProfiles: createPlayerProfileService(),
      sharing: createSharingService(),
      templates: createTemplateService(),
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/cards/card-1/export", {
      headers: {
        authorization: "Bearer access-token",
      },
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: {
        code: "CARD_NOT_EXPORTABLE",
        message: "Only active convention cards can be exported.",
      },
    });
  });

  it("creates a share link for an owned card", async () => {
    const sharing = createSharingService();
    const app = createApp({
      auth: createAuthService(),
      authProvider: createAuthProvider(),
      cards: createCardService(),
      partnerships: createPartnershipService(),
      playerProfiles: createPlayerProfileService(),
      sharing,
      templates: createTemplateService(),
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/cards/card-1/share-links", {
      method: "POST",
      body: JSON.stringify({}),
      headers: {
        authorization: "Bearer access-token",
        "content-type": "application/json",
      },
    });

    expect(response.status).toBe(201);
    expect(sharing.createShareLink).toHaveBeenCalledWith({
      cardId: "card-1",
      ownerPlayerId: "player-1",
      expiresAt: null,
    });
    expect(await response.json()).toMatchObject({
      data: {
        token: "raw-share-token",
      },
    });
  });

  it("maps past share-link expiry to a validation response", async () => {
    const sharing = createSharingService();
    vi.mocked(sharing.createShareLink).mockResolvedValueOnce(
      err("SHARE_LINK_EXPIRY_IN_PAST", "Share link expiry must be in the future."),
    );
    const app = createApp({
      auth: createAuthService(),
      authProvider: createAuthProvider(),
      cards: createCardService(),
      partnerships: createPartnershipService(),
      playerProfiles: createPlayerProfileService(),
      sharing,
      templates: createTemplateService(),
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/cards/card-1/share-links", {
      method: "POST",
      body: JSON.stringify({
        expiresAt: "2026-09-02T11:59:59.000Z",
      }),
      headers: {
        authorization: "Bearer access-token",
        "content-type": "application/json",
      },
    });

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: {
        code: "SHARE_LINK_EXPIRY_IN_PAST",
        message: "Share link expiry must be in the future.",
      },
    });
  });

  it("lists share links for an owned card", async () => {
    const sharing = createSharingService();
    const app = createApp({
      auth: createAuthService(),
      authProvider: createAuthProvider(),
      cards: createCardService(),
      partnerships: createPartnershipService(),
      playerProfiles: createPlayerProfileService(),
      sharing,
      templates: createTemplateService(),
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/cards/card-1/share-links", {
      headers: {
        authorization: "Bearer access-token",
      },
    });

    expect(response.status).toBe(200);
    expect(sharing.listShareLinks).toHaveBeenCalledWith("card-1", "player-1");
  });

  it("does not expose a user-facing hard-delete route", async () => {
    const cards = createCardService();
    const app = createApp({
      auth: createAuthService(),
      authProvider: createAuthProvider(),
      cards,
      partnerships: createPartnershipService(),
      playerProfiles: createPlayerProfileService(),
      sharing: createSharingService(),
      templates: createTemplateService(),
      wbfVerification: createWbfVerificationService(),
    });

    const response = await app.request("/cards/card-1", {
      method: "DELETE",
      headers: {
        authorization: "Bearer access-token",
      },
    });

    expect(response.status).toBe(404);
    expect(cards.archiveCard).not.toHaveBeenCalled();
  });
});
