import { err, ok, type Result } from "../shared/result.js";
import type { TemplateRepository } from "./template.repository.js";
import type { CardTemplate } from "./template.types.js";

export type TemplateServiceError = "TEMPLATE_NOT_FOUND";

export type TemplateService = {
  listTemplates(): Promise<Result<CardTemplate[], TemplateServiceError>>;
  getTemplate(slug: string): Promise<Result<CardTemplate, TemplateServiceError>>;
};

export function createTemplateService(templates: TemplateRepository): TemplateService {
  return {
    async listTemplates() {
      return ok(await templates.listSystemTemplates());
    },

    async getTemplate(slug) {
      const template = await templates.findBySlug(slug);

      if (!template) {
        return err("TEMPLATE_NOT_FOUND");
      }

      return ok(template);
    },
  };
}
