import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const migrationUrl = new URL(
  "../../../backend/src/db/migrations/0008_archived_card_cleanup.sql",
  import.meta.url,
);

describe("archived card cleanup migration", () => {
  it("removes direct hard-delete access from browser-facing database roles", async () => {
    const migration = await readFile(migrationUrl, "utf8");

    expect(migration).toContain("DROP POLICY IF EXISTS convention_cards_delete_owner");
    expect(migration).toContain("REVOKE DELETE ON public.convention_cards FROM anon");
    expect(migration).toContain("REVOKE DELETE ON public.convention_cards FROM authenticated");
  });

  it("uses a bounded, locked batch and re-checks archival before deleting", async () => {
    const migration = await readFile(migrationUrl, "utf8");

    expect(migration).toContain("LIMIT p_batch_size");
    expect(migration).toContain("FOR UPDATE SKIP LOCKED");
    expect(migration).toMatch(
      /DELETE FROM public\.convention_cards[\s\S]*AND status = 'archived'[\s\S]*AND archived_at < deletion_timestamp - interval '60 days'/,
    );
  });

  it("keeps a private durable audit record and blocks API roles from invoking cleanup", async () => {
    const migration = await readFile(migrationUrl, "utf8");

    expect(migration).toContain("app_private.convention_card_deletion_log");
    expect(migration).toContain("share_links_deleted");
    expect(migration).toContain("activity_events_deleted");
    expect(migration).toContain("source_card_references_cleared");
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION app_private.purge_archived_convention_cards(integer) FROM anon",
    );
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION app_private.purge_archived_convention_cards(integer) FROM authenticated",
    );
  });

  it("schedules one daily batch", async () => {
    const migration = await readFile(migrationUrl, "utf8");

    expect(migration).toContain("purge-archived-convention-cards-daily");
    expect(migration).toContain("'15 3 * * *'");
    expect(migration).toContain("app_private.purge_archived_convention_cards(500)");
  });
});
