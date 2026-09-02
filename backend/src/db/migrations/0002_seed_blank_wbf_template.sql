INSERT INTO card_templates (slug, name, description, card_data, is_system_template)
VALUES (
  'blank-wbf-card',
  'Blank WBF Card',
  'Empty WBF-style convention card used as a starting point for a new partnership card.',
  '{
    "meta": {
      "format": "wbf",
      "version": 1
    },
    "players": {
      "northSouth": {
        "playerOne": "",
        "playerTwo": ""
      }
    },
    "system": {
      "generalApproach": "",
      "openingStyle": ""
    },
    "openings": {},
    "competitive": {},
    "defensive": {},
    "leadsAndSignals": {},
    "notes": {}
  }'::jsonb,
  true
)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  card_data = EXCLUDED.card_data,
  is_system_template = EXCLUDED.is_system_template,
  updated_at = now();
