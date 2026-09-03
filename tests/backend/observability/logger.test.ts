import { afterEach, describe, expect, it, vi } from "vitest";

import { createJsonLogger } from "../../../backend/src/observability/index.js";

describe("JSON logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes structured logs with timestamps and fields", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const logger = createJsonLogger({
      now: () => new Date("2026-09-03T12:00:00.000Z"),
    });

    logger.info("server.started", {
      port: 3000,
    });

    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify({
        level: "info",
        message: "server.started",
        timestamp: "2026-09-03T12:00:00.000Z",
        port: 3000,
      }),
    );
  });

  it("filters logs below the configured level", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const logger = createJsonLogger({
      level: "warn",
      now: () => new Date("2026-09-03T12:00:00.000Z"),
    });

    logger.info("hidden");
    logger.warn("visible");

    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});
