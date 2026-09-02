import { describe, expect, it } from "vitest";

import { parseWbfPeopleFinderPage } from "../../../backend/src/wbf-verification/index.js";

describe("WBF People Finder parser", () => {
  it("normalizes a found player page", () => {
    const checkedAt = new Date("2026-09-02T12:00:00.000Z");

    const result = parseWbfPeopleFinderPage({
      html: `
        <html>
          <body>
            <h1>People Finder</h1>
            <dl>
              <dt>Name</dt><dd>Jan Kowalski</dd>
              <dt>Country</dt><dd>Poland</dd>
              <dt>WBF Code</dt><dd>123456</dd>
            </dl>
          </body>
        </html>
      `,
      wbfNumber: "123456",
      sourceUrl: "https://www.worldbridge.org/person/?qryid=123456",
      checkedAt,
    });

    expect(result).toEqual({
      status: "found",
      wbfNumber: "123456",
      playerName: "Jan Kowalski",
      countryOrNbo: "Poland",
      sourceUrl: "https://www.worldbridge.org/person/?qryid=123456",
      checkedAt,
      confidence: "high",
    });
  });

  it("returns not_found when the page says the player is missing", () => {
    const result = parseWbfPeopleFinderPage({
      html: "<p>No person found for this query.</p>",
      wbfNumber: "999999",
      sourceUrl: "https://www.worldbridge.org/person/?qryid=999999",
      checkedAt: new Date("2026-09-02T12:00:00.000Z"),
    });

    expect(result.status).toBe("not_found");
  });

  it("returns unavailable when the page has no useful player signals", () => {
    const result = parseWbfPeopleFinderPage({
      html: "<html><body><h1>People Finder</h1><p>Search site</p></body></html>",
      wbfNumber: "123456",
      sourceUrl: "https://www.worldbridge.org/person/?qryid=123456",
      checkedAt: new Date("2026-09-02T12:00:00.000Z"),
    });

    expect(result.status).toBe("unavailable");
  });
});
