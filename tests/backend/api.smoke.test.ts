import { describe, expect, it } from "vitest";

import { createActivityService, type ActivityEvent, type ActivityListFilters, type ActivityRepository, type CreateActivityEventInput } from "../../backend/src/activity/index.js";
import { createApp } from "../../backend/src/app.js";
import { createAuthService, type AuthProvider, type AuthSession } from "../../backend/src/auth/index.js";
import { createCardService, type CardListFilters, type CardRepository, type CardStatus, type ConventionCard, type ConventionCardData, type PartnerCardReviewStatus } from "../../backend/src/cards/index.js";
import { createCardExportService } from "../../backend/src/exports/index.js";
import { createPartnershipService } from "../../backend/src/partnerships/index.js";
import type { CreatePartnershipRecordInput, Partnership, PartnershipStatus } from "../../backend/src/partnerships/index.js";
import type { PlayerRepository } from "../../backend/src/players/player.repository.js";
import type { CreatePlayerInput, Player, UpdatePlayerProfileInput } from "../../backend/src/players/player.types.js";
import { createPlayerProfileService } from "../../backend/src/players/playerProfile.service.js";
import { err, ok } from "../../backend/src/shared/result.js";
import { createSharingService, hashShareToken, type CreateShareLinkInput, type PublicSharedCard, type ShareLink, type SharingRepository } from "../../backend/src/sharing/index.js";
import { createTemplateService, type CardTemplate, type TemplateRepository } from "../../backend/src/templates/index.js";
import { createCardValidationService } from "../../backend/src/validation/index.js";
import type { WbfVerificationService } from "../../backend/src/wbf-verification/index.js";

const OWNER_AUTH_ID = "00000000-0000-4000-8000-000000000101";
const PARTNER_AUTH_ID = "00000000-0000-4000-8000-000000000102";
const OWNER_PLAYER_ID = "00000000-0000-4000-8000-000000000201";
const PARTNER_PLAYER_ID = "00000000-0000-4000-8000-000000000202";
const PARTNERSHIP_ID = "00000000-0000-4000-8000-000000000301";
const CARD_ID = "00000000-0000-4000-8000-000000000401";
const TEMPLATE_ID = "00000000-0000-4000-8000-000000000501";
const SHARE_LINK_ID = "00000000-0000-4000-8000-000000000601";

type JsonResponse<T> = {
  data: T;
};

function now(): Date {
  return new Date("2026-09-03T12:00:00.000Z");
}

function createPlayer(input: CreatePlayerInput, index: number): Player {
  const createdAt = now();

  return {
    id: index === 0 ? OWNER_PLAYER_ID : PARTNER_PLAYER_ID,
    authUserId: input.authUserId,
    wbfNumber: input.wbfNumber,
    email: input.email,
    displayName: input.displayName ?? null,
    countryOrNbo: input.countryOrNbo ?? null,
    verificationStatus: input.verificationStatus ?? "pending",
    verificationSource: input.verificationSource ?? null,
    verificationCheckedAt: input.verificationCheckedAt ?? null,
    lastLoginAt: null,
    createdAt,
    updatedAt: createdAt,
  };
}

function createInMemoryAuthProvider(): AuthProvider {
  const authUsers = new Map<string, { id: string; email: string; password: string }>();
  const tokenToAuthUserId = new Map<string, string>();

  return {
    async registerWithEmailPassword(email, password) {
      if (authUsers.has(email)) {
        return err("AUTH_EMAIL_ALREADY_EXISTS");
      }

      const id = email.startsWith("owner") ? OWNER_AUTH_ID : PARTNER_AUTH_ID;
      authUsers.set(email, { id, email, password });
      return ok({ id, email });
    },
    async signInWithEmailPassword(email, password) {
      const user = authUsers.get(email);

      if (!user || user.password !== password) {
        return err("AUTH_INVALID_CREDENTIALS");
      }

      const session: AuthSession = {
        accessToken: `access-token-${user.id}`,
        refreshToken: `refresh-token-${user.id}`,
        expiresAt: 1_788_444_800,
      };

      tokenToAuthUserId.set(session.accessToken, user.id);
      return ok(session);
    },
    async refreshSession(refreshToken) {
      const authUserId = refreshToken.replace("refresh-token-", "");
      return ok({
        accessToken: `access-token-${authUserId}-refreshed`,
        refreshToken,
        expiresAt: 1_788_444_800,
      });
    },
    async sendPasswordResetEmail() {
      return ok(undefined);
    },
    async updatePassword(authUserId, newPassword) {
      const user = [...authUsers.values()].find((candidate) => candidate.id === authUserId);

      if (!user) {
        return err("AUTH_PASSWORD_UPDATE_FAILED");
      }

      authUsers.set(user.email, { ...user, password: newPassword });
      return ok(undefined);
    },
    async getUserByAccessToken(accessToken) {
      const authUserId = tokenToAuthUserId.get(accessToken);

      if (!authUserId) {
        return err("AUTH_SESSION_INVALID");
      }

      const user = [...authUsers.values()].find((candidate) => candidate.id === authUserId);
      return user ? ok({ id: user.id, email: user.email }) : err("AUTH_SESSION_INVALID");
    },
    async signOut(accessToken) {
      if (accessToken) {
        tokenToAuthUserId.delete(accessToken);
      }

      return ok(undefined);
    },
  };
}

function createInMemoryPlayerRepository(): PlayerRepository {
  const players: Player[] = [];

  return {
    async findByWbfNumber(wbfNumber) {
      return players.find((player) => player.wbfNumber === wbfNumber) ?? null;
    },
    async findByEmail(email) {
      return players.find((player) => player.email === email) ?? null;
    },
    async findByAuthUserId(authUserId) {
      return players.find((player) => player.authUserId === authUserId) ?? null;
    },
    async create(input) {
      const player = createPlayer(input, players.length);
      players.push(player);
      return player;
    },
    async updateProfile(playerId, input: UpdatePlayerProfileInput, updatedAt) {
      const player = players.find((candidate) => candidate.id === playerId);
      if (!player) return null;

      if (input.displayName !== undefined) player.displayName = input.displayName;
      if (input.countryOrNbo !== undefined) player.countryOrNbo = input.countryOrNbo;
      player.updatedAt = updatedAt;
      return player;
    },
    async markLogin(authUserId, loggedInAt) {
      const player = players.find((candidate) => candidate.authUserId === authUserId);
      if (!player) return;

      player.lastLoginAt = loggedInAt;
      player.updatedAt = loggedInAt;
    },
  };
}

function createInMemoryPartnershipRepository(players: Pick<PlayerRepository, "findByWbfNumber">) {
  const partnerships: Partnership[] = [];

  return {
    async create(input: CreatePartnershipRecordInput) {
      const partnership: Partnership = {
        id: PARTNERSHIP_ID,
        ownerPlayerId: input.ownerPlayerId,
        partnerPlayerId: input.partnerPlayerId ?? null,
        partnerWbfNumber: input.partnerWbfNumber,
        status: "pending",
        approvedAt: null,
        createdAt: now(),
        updatedAt: now(),
      };

      partnerships.push(partnership);
      return partnership;
    },
    async listForPlayer(playerId: string, wbfNumber: string) {
      return partnerships.filter(
        (partnership) =>
          partnership.ownerPlayerId === playerId ||
          partnership.partnerPlayerId === playerId ||
          partnership.partnerWbfNumber === wbfNumber,
      );
    },
    async findById(partnershipId: string) {
      return partnerships.find((partnership) => partnership.id === partnershipId) ?? null;
    },
    async findForParticipant(partnershipId: string, playerId: string, wbfNumber: string) {
      return (
        partnerships.find(
          (partnership) =>
            partnership.id === partnershipId &&
            (partnership.ownerPlayerId === playerId ||
              partnership.partnerPlayerId === playerId ||
              partnership.partnerWbfNumber === wbfNumber),
        ) ?? null
      );
    },
    async updateStatus(
      partnershipId: string,
      status: PartnershipStatus,
      updatedAt: Date,
      values: { partnerPlayerId?: string | null; approvedAt?: Date | null } = {},
    ) {
      const partnership = partnerships.find((candidate) => candidate.id === partnershipId);
      if (!partnership) return null;

      partnership.status = status;
      partnership.updatedAt = updatedAt;
      if (values.partnerPlayerId !== undefined) partnership.partnerPlayerId = values.partnerPlayerId;
      if (values.approvedAt !== undefined) partnership.approvedAt = values.approvedAt;
      return partnership;
    },
    async resolvePartnerByWbf(wbfNumber: string) {
      return players.findByWbfNumber(wbfNumber);
    },
  };
}

function createInMemoryCardRepository(partnerships: ReturnType<typeof createInMemoryPartnershipRepository>): CardRepository {
  const cards: ConventionCard[] = [];

  return {
    async createDraft(input) {
      const card: ConventionCard = {
        id: CARD_ID,
        ownerPlayerId: input.ownerPlayerId,
        partnershipId: input.partnershipId,
        sourceCardId: input.sourceCardId ?? null,
        revisionNumber: input.revisionNumber ?? 1,
        title: input.title,
        status: "draft",
        cardData: input.cardData,
        submittedAt: null,
        partnerReviewedByPlayerId: null,
        partnerReviewedAt: null,
        partnerRejectionReason: null,
        activatedAt: null,
        archivedAt: null,
        createdAt: now(),
        updatedAt: now(),
      };

      cards.push(card);
      return card;
    },
    async createDraftRevisionFromCard(sourceCard) {
      const revision: ConventionCard = {
        ...sourceCard,
        id: "00000000-0000-4000-8000-000000000402",
        sourceCardId: sourceCard.id,
        revisionNumber: sourceCard.revisionNumber + 1,
        status: "draft",
        partnerReviewedByPlayerId: null,
        partnerReviewedAt: null,
        partnerRejectionReason: null,
        createdAt: now(),
        updatedAt: now(),
      };

      cards.push(revision);
      return revision;
    },
    async listByOwner(ownerPlayerId, filters: CardListFilters = {}) {
      return cards.filter((card) => {
        if (card.ownerPlayerId !== ownerPlayerId) return false;
        if (filters.statuses?.length) return filters.statuses.includes(card.status);
        return filters.includeArchived === true || card.status !== "archived";
      });
    },
    async listPendingReviewForPartner(playerId, wbfNumber) {
      const pendingCards: ConventionCard[] = [];

      for (const card of cards) {
        if (card.status !== "pending_partner_approval" || !card.partnershipId) {
          continue;
        }

        const partnership = await partnerships.findById(card.partnershipId);
        if (
          partnership?.status === "approved" &&
          (partnership.partnerPlayerId === playerId || partnership.partnerWbfNumber === wbfNumber)
        ) {
          pendingCards.push(card);
        }
      }

      return pendingCards;
    },
    async findOwnedCard(cardId, ownerPlayerId) {
      return cards.find((card) => card.id === cardId && card.ownerPlayerId === ownerPlayerId) ?? null;
    },
    async findDraftRevisionForSourceCard(sourceCardId, ownerPlayerId) {
      return cards.find((card) => card.sourceCardId === sourceCardId && card.ownerPlayerId === ownerPlayerId && card.status === "draft") ?? null;
    },
    async findCardForPartnerReview(cardId, playerId, wbfNumber) {
      const card = cards.find((candidate) => candidate.id === cardId);
      if (!card?.partnershipId) return null;

      const partnership = await partnerships.findById(card.partnershipId);

      if (
        !partnership ||
        partnership.status !== "approved" ||
        (partnership.partnerPlayerId !== playerId && partnership.partnerWbfNumber !== wbfNumber)
      ) {
        return null;
      }

      return card;
    },
    async updateDraft(input, updatedAt) {
      const card = cards.find((candidate) => candidate.id === input.cardId && candidate.ownerPlayerId === input.ownerPlayerId && candidate.status === "draft");
      if (!card) return null;

      if (input.title !== undefined) card.title = input.title;
      if (input.cardData !== undefined) card.cardData = input.cardData;
      card.updatedAt = updatedAt;
      return card;
    },
    async updateStatus(cardId, ownerPlayerId, status: CardStatus, updatedAt) {
      const card = cards.find((candidate) => candidate.id === cardId && candidate.ownerPlayerId === ownerPlayerId);
      if (!card) return null;

      card.status = status;
      card.updatedAt = updatedAt;

      if (status === "pending_partner_approval") {
        card.submittedAt = updatedAt;
        card.partnerReviewedByPlayerId = null;
        card.partnerReviewedAt = null;
        card.partnerRejectionReason = null;
      }

      if (status === "active") {
        card.activatedAt = updatedAt;
      }

      if (status === "archived") {
        card.archivedAt = updatedAt;
      }

      return card;
    },
    async updatePartnerReviewStatus(input: {
      cardId: string;
      reviewedByPlayerId: string;
      status: PartnerCardReviewStatus;
      reviewedAt: Date;
      rejectionReason?: string | null;
    }) {
      const card = cards.find((candidate) => candidate.id === input.cardId && candidate.status === "pending_partner_approval");
      if (!card) return null;

      card.status = input.status;
      card.partnerReviewedByPlayerId = input.reviewedByPlayerId;
      card.partnerReviewedAt = input.reviewedAt;
      card.partnerRejectionReason = input.status === "partner_rejected" ? input.rejectionReason ?? null : null;
      card.updatedAt = input.reviewedAt;
      return card;
    },
  };
}

function createInMemorySharingRepository(cards: CardRepository, players: PlayerRepository): SharingRepository {
  const links: ShareLink[] = [];

  return {
    async create(input: CreateShareLinkInput) {
      const link: ShareLink = {
        id: SHARE_LINK_ID,
        cardId: input.cardId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt ?? null,
        revokedAt: null,
        createdAt: now(),
      };

      links.push(link);
      return link;
    },
    async listForCard(cardId) {
      return links.filter((link) => link.cardId === cardId);
    },
    async findByIdForOwnedCard(shareLinkId, ownerPlayerId) {
      const ownerCards = await cards.listByOwner(ownerPlayerId);
      const ownedCardIds = new Set(ownerCards.map((card) => card.id));
      return links.find((link) => link.id === shareLinkId && ownedCardIds.has(link.cardId)) ?? null;
    },
    async revoke(shareLinkId, revokedAt) {
      const link = links.find((candidate) => candidate.id === shareLinkId);
      if (!link) return null;

      link.revokedAt = revokedAt;
      return link;
    },
    async findPublicSharedCardByTokenHash(tokenHash, requestTime) {
      const link = links.find(
        (candidate) =>
          candidate.tokenHash === tokenHash &&
          !candidate.revokedAt &&
          (!candidate.expiresAt || candidate.expiresAt > requestTime),
      );

      if (!link) return null;

      const [ownerCard] = await cards.listByOwner(OWNER_PLAYER_ID, { includeArchived: true });
      const owner = await players.findByWbfNumber("111111");
      const partner = await players.findByWbfNumber("222222");

      if (!ownerCard || !owner || ownerCard.status !== "active") return null;

      return {
        card: {
          id: ownerCard.id,
          title: ownerCard.title,
          status: ownerCard.status,
          cardData: ownerCard.cardData,
          updatedAt: ownerCard.updatedAt,
        },
        players: {
          owner: {
            displayName: owner.displayName,
            wbfNumber: owner.wbfNumber,
          },
          partner: partner
            ? {
                displayName: partner.displayName,
                wbfNumber: partner.wbfNumber,
              }
            : null,
        },
        shareLink: {
          id: link.id,
          expiresAt: link.expiresAt,
          createdAt: link.createdAt,
        },
      } satisfies PublicSharedCard;
    },
  };
}

function createInMemoryTemplateRepository(): TemplateRepository {
  const template: CardTemplate = {
    id: TEMPLATE_ID,
    slug: "blank-wbf-card",
    name: "Blank WBF Card",
    description: "Blank WBF template",
    cardData: {},
    isSystemTemplate: true,
    createdAt: now(),
    updatedAt: now(),
  };

  return {
    async listSystemTemplates() {
      return [template];
    },
    async findBySlug(slug) {
      return slug === template.slug ? template : null;
    },
  };
}

function createInMemoryActivityRepository(): ActivityRepository {
  const events: ActivityEvent[] = [];

  function matchesFilters(event: ActivityEvent, filters: ActivityListFilters = {}): boolean {
    if (filters.eventTypes?.length && !filters.eventTypes.includes(event.eventType)) return false;
    if (filters.entityTypes?.length && !filters.entityTypes.includes(event.entityType)) return false;
    if (filters.cardId && event.cardId !== filters.cardId) return false;
    if (filters.partnershipId && event.partnershipId !== filters.partnershipId) return false;
    if (filters.shareLinkId && event.shareLinkId !== filters.shareLinkId) return false;
    return true;
  }

  return {
    async create(input: CreateActivityEventInput) {
      const event: ActivityEvent = {
        id: `00000000-0000-4000-8000-${String(events.length + 701).padStart(12, "0")}`,
        eventType: input.eventType,
        actorPlayerId: input.actorPlayerId ?? null,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        cardId: input.cardId ?? null,
        partnershipId: input.partnershipId ?? null,
        shareLinkId: input.shareLinkId ?? null,
        metadata: input.metadata ?? {},
        createdAt: input.createdAt ?? now(),
      };

      events.push(event);
      return event;
    },
    async listForPlayer(playerId, limit, filters = {}) {
      return events
        .filter((event) => event.actorPlayerId === playerId || event.cardId === CARD_ID || event.partnershipId === PARTNERSHIP_ID)
        .filter((event) => matchesFilters(event, filters))
        .slice(0, limit);
    },
    async listForCard(cardId, limit) {
      return events.filter((event) => event.cardId === cardId).slice(0, limit);
    },
  };
}

function createWbfVerificationService(): WbfVerificationService {
  return {
    async verifyWbfNumber(wbfNumber) {
      return {
        status: "found",
        wbfNumber,
        playerName: wbfNumber === "111111" ? "Owner Player" : "Partner Player",
        countryOrNbo: "DEN",
        sourceUrl: "https://www.worldbridge.org/",
        checkedAt: now(),
        confidence: "high",
      };
    },
  };
}

async function readData<T>(response: Response): Promise<T> {
  expect(response.status).toBeGreaterThanOrEqual(200);
  expect(response.status).toBeLessThan(300);
  return ((await response.json()) as JsonResponse<T>).data;
}

describe("backend API smoke flow", () => {
  it("supports the player, partnership, card, sharing, and activity flow through HTTP routes", async () => {
    const authProvider = createInMemoryAuthProvider();
    const players = createInMemoryPlayerRepository();
    const partnershipsRepository = createInMemoryPartnershipRepository(players);
    const cardsRepository = createInMemoryCardRepository(partnershipsRepository);
    const sharingRepository = createInMemorySharingRepository(cardsRepository, players);
    const activityRepository = createInMemoryActivityRepository();
    const validation = createCardValidationService();
    const activity = createActivityService({
      activity: activityRepository,
      cards: cardsRepository,
    });
    const wbfVerification = createWbfVerificationService();
    const auth = createAuthService({
      players,
      authProvider,
      wbfVerification,
      activity,
    });
    const cards = createCardService({
      cards: cardsRepository,
      partnerships: partnershipsRepository,
      validation,
      activity,
    });
    const exports = createCardExportService({
      cards,
      validation,
      activity,
    });
    const app = createApp({
      activity,
      auth,
      authProvider,
      cards,
      exports,
      partnerships: createPartnershipService({
        partnerships: partnershipsRepository,
        players,
        activity,
      }),
      playerProfiles: createPlayerProfileService({ players }),
      sharing: createSharingService({
        cards: cardsRepository,
        partnerships: partnershipsRepository,
        sharing: sharingRepository,
        activity,
        generateToken: () => "sample-share-token",
      }),
      templates: createTemplateService(createInMemoryTemplateRepository()),
      wbfVerification,
    });

    await readData(
      await app.request("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          wbfNumber: "111111",
          email: "owner@example.com",
          password: "password-123",
        }),
        headers: { "content-type": "application/json" },
      }),
    );

    await readData(
      await app.request("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          wbfNumber: "222222",
          email: "partner@example.com",
          password: "password-456",
        }),
        headers: { "content-type": "application/json" },
      }),
    );

    const ownerLogin = await readData<{ session: AuthSession }>(
      await app.request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ wbfNumber: "111111", password: "password-123" }),
        headers: { "content-type": "application/json" },
      }),
    );
    const partnerLogin = await readData<{ session: AuthSession }>(
      await app.request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ wbfNumber: "222222", password: "password-456" }),
        headers: { "content-type": "application/json" },
      }),
    );
    const ownerAuth = { authorization: `Bearer ${ownerLogin.session.accessToken}` };
    const partnerAuth = { authorization: `Bearer ${partnerLogin.session.accessToken}` };

    const partnership = await readData<Partnership>(
      await app.request("/partnerships", {
        method: "POST",
        body: JSON.stringify({ partnerWbfNumber: "222222" }),
        headers: { ...ownerAuth, "content-type": "application/json" },
      }),
    );

    expect(partnership.status).toBe("pending");
    expect(partnership.partnerPlayerId).toBe(PARTNER_PLAYER_ID);

    const approvedPartnership = await readData<Partnership>(
      await app.request(`/partnerships/${partnership.id}/approve`, {
        method: "POST",
        headers: partnerAuth,
      }),
    );

    expect(approvedPartnership.status).toBe("approved");

    const card = await readData<ConventionCard>(
      await app.request("/cards/from-template", {
        method: "POST",
        body: JSON.stringify({
          templateSlug: "blank-wbf-card",
          partnershipId: partnership.id,
          title: "2/1 with Partner",
        }),
        headers: { ...ownerAuth, "content-type": "application/json" },
      }),
    );

    expect(card.status).toBe("draft");

    await readData<ConventionCard>(
      await app.request(`/cards/${card.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          cardData: {
            openings: {
              oneClub: "2+",
            },
          } satisfies ConventionCardData,
        }),
        headers: { ...ownerAuth, "content-type": "application/json" },
      }),
    );

    const validationResult = await readData<{ validation: { valid: boolean } }>(
      await app.request(`/cards/${card.id}/validation`, {
        headers: ownerAuth,
      }),
    );

    expect(validationResult.validation.valid).toBe(true);

    await readData<ConventionCard>(
      await app.request(`/cards/${card.id}/submit-for-approval`, {
        method: "POST",
        headers: ownerAuth,
      }),
    );

    await readData<ConventionCard>(
      await app.request(`/cards/${card.id}/review/approve`, {
        method: "POST",
        headers: partnerAuth,
      }),
    );

    const activeCard = await readData<ConventionCard>(
      await app.request(`/cards/${card.id}/activate`, {
        method: "POST",
        headers: ownerAuth,
      }),
    );

    expect(activeCard.status).toBe("active");

    const exported = await readData<{ card: { status: string } }>(
      await app.request(`/cards/${card.id}/export`, {
        headers: ownerAuth,
      }),
    );

    expect(exported.card.status).toBe("active");

    const share = await readData<{ token: string }>(
      await app.request(`/cards/${card.id}/share-links`, {
        method: "POST",
        body: JSON.stringify({}),
        headers: { ...ownerAuth, "content-type": "application/json" },
      }),
    );

    expect(share.token).toBe("sample-share-token");

    const sharedCard = await readData<PublicSharedCard>(
      await app.request(`/shared/cards/${share.token}`),
    );

    expect(sharedCard.card.status).toBe("active");
    expect(sharedCard.players.owner.wbfNumber).toBe("111111");
    expect(sharedCard.players.partner?.wbfNumber).toBe("222222");

    const activityResponse = await readData<{ events: ActivityEvent[] }>(
      await app.request(`/activity?eventType=card.updated,share_link.created&cardId=${card.id}`, {
        headers: ownerAuth,
      }),
    );

    expect(activityResponse.events.map((event) => event.eventType)).toEqual([
      "card.updated",
      "share_link.created",
    ]);
  });
});
