ALTER TYPE card_status ADD VALUE IF NOT EXISTS 'partner_approved';
ALTER TYPE card_status ADD VALUE IF NOT EXISTS 'partner_rejected';

ALTER TABLE convention_cards
  ADD COLUMN IF NOT EXISTS partner_reviewed_by_player_id uuid REFERENCES players(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS partner_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS partner_rejection_reason text;

CREATE INDEX IF NOT EXISTS convention_cards_partner_reviewed_by_player_id_idx
  ON convention_cards (partner_reviewed_by_player_id);
