# Database

Database configuration, migrations, and persistence helpers live here.

The data model should store convention card content as structured fields rather than an opaque PDF or screenshot. This allows autosave, validation, cloning an existing card into a new draft, faithful rendering, browser print, and PDF export from the same source data.

Expected core entities:

- `players`
- `partnerships`
- `convention_cards`
- `card_templates`
- `share_links`
- `activity_events`

Incomplete cards should be persisted as drafts. Activation, sharing, and official export should depend on validation and partner approval rather than on whether the draft can be saved.
