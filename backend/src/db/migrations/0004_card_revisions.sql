ALTER TABLE convention_cards
  ADD COLUMN IF NOT EXISTS source_card_id uuid REFERENCES convention_cards(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS revision_number integer NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS convention_cards_source_card_id_idx
  ON convention_cards (source_card_id);
