# Database (DB)

Database configuration, Drizzle schema definitions, and migrations live here.

The first schema supports:

- `players`: WBF-number identity linked to Supabase Auth users.
- `partnerships`: relationship/approval state between players.
- `convention_cards`: card metadata plus flexible `jsonb` card content.
- `card_templates`: reusable starting points such as a blank WBF card.
- `share_links`: revocable read-only card links.

Cards can be persisted as incomplete drafts. Validation should block activation, sharing, and official export later, not ordinary autosave.
