import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type { ConventionCardData } from "../cards/card.types.js";

export const verificationStatusEnum = pgEnum("verification_status", [
  "pending",
  "verified",
  "unverified",
  "failed",
]);

export const partnershipStatusEnum = pgEnum("partnership_status", [
  "pending",
  "approved",
  "declined",
  "archived",
]);

export const cardStatusEnum = pgEnum("card_status", [
  "draft",
  "pending_partner_approval",
  "partner_approved",
  "partner_rejected",
  "active",
  "archived",
]);

export const players = pgTable(
  "players",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authUserId: uuid("auth_user_id").notNull().unique(),
    wbfNumber: text("wbf_number").notNull().unique(),
    email: text("email").notNull().unique(),
    displayName: text("display_name"),
    countryOrNbo: text("country_or_nbo"),
    verificationStatus: verificationStatusEnum("verification_status").notNull().default("pending"),
    verificationSource: text("verification_source"),
    verificationCheckedAt: timestamp("verification_checked_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    wbfNumberIndex: uniqueIndex("players_wbf_number_idx").on(table.wbfNumber),
    emailIndex: uniqueIndex("players_email_idx").on(table.email),
    authUserIndex: uniqueIndex("players_auth_user_id_idx").on(table.authUserId),
  }),
);

export const partnerships = pgTable(
  "partnerships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerPlayerId: uuid("owner_player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    partnerPlayerId: uuid("partner_player_id").references(() => players.id, { onDelete: "set null" }),
    partnerWbfNumber: text("partner_wbf_number").notNull(),
    status: partnershipStatusEnum("status").notNull().default("pending"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerIndex: index("partnerships_owner_player_id_idx").on(table.ownerPlayerId),
    partnerIndex: index("partnerships_partner_player_id_idx").on(table.partnerPlayerId),
  }),
);

export const conventionCards = pgTable(
  "convention_cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerPlayerId: uuid("owner_player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    partnershipId: uuid("partnership_id").references(() => partnerships.id, { onDelete: "set null" }),
    title: text("title").notNull().default("Untitled card"),
    status: cardStatusEnum("status").notNull().default("draft"),
    cardData: jsonb("card_data").$type<ConventionCardData>().notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    partnerReviewedByPlayerId: uuid("partner_reviewed_by_player_id").references(() => players.id, { onDelete: "set null" }),
    partnerReviewedAt: timestamp("partner_reviewed_at", { withTimezone: true }),
    partnerRejectionReason: text("partner_rejection_reason"),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerIndex: index("convention_cards_owner_player_id_idx").on(table.ownerPlayerId),
    partnershipIndex: index("convention_cards_partnership_id_idx").on(table.partnershipId),
    partnerReviewIndex: index("convention_cards_partner_reviewed_by_player_id_idx").on(table.partnerReviewedByPlayerId),
    statusIndex: index("convention_cards_status_idx").on(table.status),
  }),
);

export const cardTemplates = pgTable(
  "card_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    cardData: jsonb("card_data").$type<ConventionCardData>().notNull(),
    isSystemTemplate: boolean("is_system_template").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugIndex: uniqueIndex("card_templates_slug_idx").on(table.slug),
  }),
);

export const shareLinks = pgTable(
  "share_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cardId: uuid("card_id")
      .notNull()
      .references(() => conventionCards.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    cardIndex: index("share_links_card_id_idx").on(table.cardId),
    tokenHashIndex: uniqueIndex("share_links_token_hash_idx").on(table.tokenHash),
  }),
);
