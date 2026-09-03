import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  activityEvents,
  conventionCardDeletionLog,
  conventionCards,
  shareLinks,
} from "../../../backend/src/db/schema.js";

function deletionActionFor(table: PgTable, columnName: string): string | undefined {
  const foreignKey = getTableConfig(table).foreignKeys.find((candidate) =>
    candidate.reference().columns.some((column) => column.name === columnName),
  );

  return foreignKey?.onDelete;
}

describe("card deletion references", () => {
  it("cascades dependent share links and activity events", () => {
    expect(deletionActionFor(shareLinks, "card_id")).toBe("cascade");
    expect(deletionActionFor(activityEvents, "card_id")).toBe("cascade");
  });

  it("keeps revisions while clearing their source card reference", () => {
    expect(deletionActionFor(conventionCards, "source_card_id")).toBe("set null");
  });

  it("keeps deletion audit records independent from deleted data", () => {
    expect(getTableConfig(conventionCardDeletionLog).foreignKeys).toHaveLength(0);
  });
});
