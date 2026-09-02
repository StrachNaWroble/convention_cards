import type { WbfVerificationResult } from "./wbfVerification.types.js";

type ParseInput = {
  html: string;
  wbfNumber: string;
  sourceUrl: string;
  checkedAt: Date;
};

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'");
}

function htmlToText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractHtmlLabelValue(html: string, labels: string[]): string | undefined {
  for (const label of labels) {
    const escapedLabel = escapeRegex(label);
    const definitionMatch = html.match(
      new RegExp(`<dt[^>]*>\\s*${escapedLabel}\\s*</dt>\\s*<dd[^>]*>([\\s\\S]*?)</dd>`, "i"),
    );
    const tableMatch = html.match(
      new RegExp(`<t[hd][^>]*>\\s*${escapedLabel}\\s*</t[hd]>\\s*<td[^>]*>([\\s\\S]*?)</td>`, "i"),
    );
    const value = definitionMatch?.[1] ?? tableMatch?.[1];

    if (value) {
      return htmlToText(value);
    }
  }

  return undefined;
}

function extractByLabels(text: string, labels: string[], boundaryLabels: string[] = labels): string | undefined {
  for (const label of labels) {
    const otherLabels = boundaryLabels.filter((candidate) => candidate !== label).map(escapeRegex).join("|");
    const lookahead = otherLabels ? `(?=\\s+(?:${otherLabels})\\s*[:\\-]?|$)` : "$";
    const match = text.match(new RegExp(`${escapeRegex(label)}\\s*[:\\-]?\\s*(.{2,80}?)${lookahead}`, "i"));
    const value = match?.[1]?.trim();

    if (value && !/^(open|women|seniors|mixed|mp|pp|title|rank)$/i.test(value)) {
      return value;
    }
  }

  return undefined;
}

function extractPlayerHeading(html: string): string | undefined {
  const heading =
    html.match(/<h1[^>]*>([^<]{2,80})<\/h1>/i)?.[1]?.trim() ??
    html.match(/<h2[^>]*>([^<]{2,80})<\/h2>/i)?.[1]?.trim();

  if (!heading || /^(people finder|person|player)$/i.test(heading)) {
    return undefined;
  }

  return heading;
}

export function parseWbfPeopleFinderPage({
  html,
  wbfNumber,
  sourceUrl,
  checkedAt,
}: ParseInput): WbfVerificationResult {
  const text = htmlToText(html);

  if (/not\s+(found|in\s+the\s+database)|no\s+record|no\s+person|cannot\s+find/i.test(text)) {
    return {
      status: "not_found",
      wbfNumber,
      sourceUrl,
      checkedAt,
      confidence: "medium",
    };
  }

  const playerName =
    extractHtmlLabelValue(html, ["name", "player", "person"]) ??
    extractByLabels(text, ["name", "player", "person"], ["name", "player", "person", "country", "nbo", "wbf code"]) ??
    extractPlayerHeading(html);
  const countryOrNbo =
    extractHtmlLabelValue(html, ["country", "nbo", "wbf code"]) ??
    extractByLabels(text, ["country", "nbo", "wbf code"], ["country", "nbo", "wbf code", "name", "player", "person"]);
  const mentionsWbfNumber = text.includes(wbfNumber);

  if (playerName || countryOrNbo || mentionsWbfNumber) {
    return {
      status: "found",
      wbfNumber,
      playerName,
      countryOrNbo,
      sourceUrl,
      checkedAt,
      confidence: playerName || countryOrNbo ? "high" : "low",
    };
  }

  return {
    status: "unavailable",
    wbfNumber,
    sourceUrl,
    checkedAt,
    confidence: "low",
  };
}
