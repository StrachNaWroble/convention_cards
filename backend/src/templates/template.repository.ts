import { asc, eq } from "drizzle-orm";

import type { Database } from "../db/client.js";
import { cardTemplates } from "../db/schema.js";
import type { CardTemplate } from "./template.types.js";

export type TemplateRepository = {
  listSystemTemplates(): Promise<CardTemplate[]>;
  findBySlug(slug: string): Promise<CardTemplate | null>;
};

export function createDrizzleTemplateRepository(db: Database): TemplateRepository {
  return {
    async listSystemTemplates() {
      return db
        .select()
        .from(cardTemplates)
        .where(eq(cardTemplates.isSystemTemplate, true))
        .orderBy(asc(cardTemplates.name));
    },

    async findBySlug(slug) {
      const [template] = await db.select().from(cardTemplates).where(eq(cardTemplates.slug, slug)).limit(1);
      return template ?? null;
    },
  };
}
