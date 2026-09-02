CREATE UNIQUE INDEX IF NOT EXISTS convention_cards_open_revision_source_idx
  ON convention_cards (source_card_id)
  WHERE source_card_id IS NOT NULL AND status = 'draft';
