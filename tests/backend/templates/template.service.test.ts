import { describe, expect, it } from "vitest";

import { createTemplateService } from "../../../backend/src/templates/index.js";
import type { CardTemplate, TemplateRepository } from "../../../backend/src/templates/index.js";

function buildTemplate(overrides: Partial<CardTemplate> = {}): CardTemplate {
  const now = new Date("2026-09-02T10:00:00.000Z");

  return {
    id: "template-1",
    slug: "blank-wbf-card",
    name: "Blank WBF Card",
    description: "Blank template",
    cardData: { meta: { format: "wbf" } },
    isSystemTemplate: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createTemplateRepository(seed: CardTemplate[] = []): TemplateRepository {
  return {
    async listSystemTemplates() {
      return seed.filter((template) => template.isSystemTemplate);
    },
    async findBySlug(slug) {
      return seed.find((template) => template.slug === slug) ?? null;
    },
  };
}

describe("template service", () => {
  it("lists system templates", async () => {
    const service = createTemplateService(
      createTemplateRepository([buildTemplate(), buildTemplate({ id: "template-2", slug: "private", isSystemTemplate: false })]),
    );

    const result = await service.listTemplates();

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data).toHaveLength(1);
    expect(result.data[0].slug).toBe("blank-wbf-card");
  });

  it("loads one template by slug", async () => {
    const service = createTemplateService(createTemplateRepository([buildTemplate()]));

    const result = await service.getTemplate("blank-wbf-card");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.name).toBe("Blank WBF Card");
  });

  it("returns not found for an unknown slug", async () => {
    const service = createTemplateService(createTemplateRepository());

    const result = await service.getTemplate("unknown-template");

    expect(result).toEqual({ ok: false, error: "TEMPLATE_NOT_FOUND" });
  });
});
