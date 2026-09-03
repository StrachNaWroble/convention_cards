export type ActivityEventType =
  | "player.registered"
  | "player.logged_in"
  | "player.password_reset_requested"
  | "player.password_changed"
  | "partnership.created"
  | "partnership.approved"
  | "partnership.declined"
  | "partnership.archived"
  | "card.created"
  | "card.revision_created"
  | "card.submitted_for_approval"
  | "card.approved_by_partner"
  | "card.rejected_by_partner"
  | "card.activated"
  | "card.archived"
  | "card.exported"
  | "share_link.created"
  | "share_link.revoked";

export type ActivityEntityType = "player" | "partnership" | "card" | "share_link";

export type ActivityEventMetadata = Record<string, unknown>;

export type ActivityEvent = {
  id: string;
  eventType: ActivityEventType;
  actorPlayerId: string | null;
  entityType: ActivityEntityType;
  entityId: string | null;
  cardId: string | null;
  partnershipId: string | null;
  shareLinkId: string | null;
  metadata: ActivityEventMetadata;
  createdAt: Date;
};

export type CreateActivityEventInput = {
  eventType: ActivityEventType;
  actorPlayerId?: string | null;
  entityType: ActivityEntityType;
  entityId?: string | null;
  cardId?: string | null;
  partnershipId?: string | null;
  shareLinkId?: string | null;
  metadata?: ActivityEventMetadata;
  createdAt?: Date;
};
