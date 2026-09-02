import { normalizeWbfNumber } from "../players/player.types.js";
import { parseWbfPeopleFinderPage } from "./wbfPeopleFinderParser.js";
import type { WbfVerificationResult, WbfVerificationService } from "./wbfVerification.types.js";

type WbfPeopleFinderOptions = {
  urlTemplate?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  now?: () => Date;
};

const DEFAULT_WBF_PERSON_URL_TEMPLATE = "https://www.worldbridge.org/person/?qryid={wbfNumber}";

function buildLookupUrl(template: string, wbfNumber: string): string {
  return template.replace("{wbfNumber}", encodeURIComponent(wbfNumber));
}

export function createUnavailableWbfVerificationService(now = () => new Date()): WbfVerificationService {
  return {
    async verifyWbfNumber(wbfNumber) {
      return {
        status: "unavailable",
        wbfNumber: normalizeWbfNumber(wbfNumber),
        checkedAt: now(),
        confidence: "low",
      };
    },
  };
}

export function createWbfPeopleFinderService({
  urlTemplate = process.env.WBF_PEOPLE_FINDER_URL_TEMPLATE ?? DEFAULT_WBF_PERSON_URL_TEMPLATE,
  fetchImpl = fetch,
  timeoutMs = 5_000,
  now = () => new Date(),
}: WbfPeopleFinderOptions = {}): WbfVerificationService {
  return {
    async verifyWbfNumber(wbfNumber): Promise<WbfVerificationResult> {
      const normalizedWbfNumber = normalizeWbfNumber(wbfNumber);
      const checkedAt = now();
      const sourceUrl = buildLookupUrl(urlTemplate, normalizedWbfNumber);
      const abortController = new AbortController();
      const timeout = setTimeout(() => abortController.abort(), timeoutMs);

      try {
        const response = await fetchImpl(sourceUrl, {
          signal: abortController.signal,
          headers: {
            accept: "text/html,application/xhtml+xml",
            "user-agent": "ConventionCards/0.1 WBF verification adapter",
          },
        });

        if (!response.ok) {
          return {
            status: response.status === 404 ? "not_found" : "unavailable",
            wbfNumber: normalizedWbfNumber,
            sourceUrl,
            checkedAt,
            confidence: response.status === 404 ? "medium" : "low",
          };
        }

        return parseWbfPeopleFinderPage({
          html: await response.text(),
          wbfNumber: normalizedWbfNumber,
          sourceUrl,
          checkedAt,
        });
      } catch {
        return {
          status: "unavailable",
          wbfNumber: normalizedWbfNumber,
          sourceUrl,
          checkedAt,
          confidence: "low",
        };
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
