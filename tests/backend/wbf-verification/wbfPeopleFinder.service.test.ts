import { describe, expect, it, vi } from "vitest";

import { createWbfPeopleFinderService } from "../../../backend/src/wbf-verification/index.js";

describe("WBF People Finder service", () => {
  it("looks up a normalized WBF number through the configured URL template", async () => {
    const fetchImpl = vi.fn(async () => new Response("<p>WBF Code: 123456</p>"));
    const service = createWbfPeopleFinderService({
      urlTemplate: "https://example.test/person/{wbfNumber}",
      fetchImpl,
      now: () => new Date("2026-09-02T12:00:00.000Z"),
    });

    const result = await service.verifyWbfNumber(" 123 456 ");

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://example.test/person/123456",
      expect.objectContaining({
        headers: expect.objectContaining({
          accept: "text/html,application/xhtml+xml",
        }),
      }),
    );
    expect(result.status).toBe("found");
    expect(result.wbfNumber).toBe("123456");
  });

  it("returns unavailable when the network lookup fails", async () => {
    const service = createWbfPeopleFinderService({
      urlTemplate: "https://example.test/person/{wbfNumber}",
      fetchImpl: vi.fn(async () => {
        throw new Error("network unavailable");
      }),
    });

    const result = await service.verifyWbfNumber("123456");

    expect(result.status).toBe("unavailable");
  });
});
