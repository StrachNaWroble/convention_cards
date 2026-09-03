import { drizzle } from "drizzle-orm/node-postgres";
import { describe, expect, it, vi } from "vitest";

import { createDrizzleSharingRepository } from "../../../backend/src/sharing/sharing.repository.js";
import * as schema from "../../../backend/src/db/schema.js";

describe("sharing repository", () => {
  it("only resolves public links whose card is still active", async () => {
    const query = vi.fn(async (..._args: unknown[]) => ({ rows: [] }));
    const db = drizzle({ client: { query } as never, schema });
    const repository = createDrizzleSharingRepository(db);

    const result = await repository.findPublicSharedCardByTokenHash(
      "token-hash",
      new Date("2026-09-03T12:00:00.000Z"),
    );

    expect(result).toBeNull();
    expect(query).toHaveBeenCalledTimes(1);

    const queryConfig = query.mock.calls[0]?.[0] as { text?: string } | undefined;
    const queryValues = query.mock.calls[0]?.[1] as unknown[] | undefined;
    expect(queryConfig?.text).toContain('"convention_cards"."status" =');
    expect(queryValues).toContain("active");
  });
});
