CREATE TABLE IF NOT EXISTS activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  actor_player_id uuid REFERENCES players(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  card_id uuid REFERENCES convention_cards(id) ON DELETE CASCADE,
  partnership_id uuid REFERENCES partnerships(id) ON DELETE SET NULL,
  share_link_id uuid REFERENCES share_links(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_events_actor_player_id_idx ON activity_events (actor_player_id);
CREATE INDEX IF NOT EXISTS activity_events_card_id_idx ON activity_events (card_id);
CREATE INDEX IF NOT EXISTS activity_events_partnership_id_idx ON activity_events (partnership_id);
CREATE INDEX IF NOT EXISTS activity_events_share_link_id_idx ON activity_events (share_link_id);
CREATE INDEX IF NOT EXISTS activity_events_created_at_idx ON activity_events (created_at);

ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS activity_events_select_related_player ON activity_events;
CREATE POLICY activity_events_select_related_player ON activity_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM players
      WHERE players.id = activity_events.actor_player_id
        AND players.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM convention_cards
      INNER JOIN players ON players.id = convention_cards.owner_player_id
      WHERE convention_cards.id = activity_events.card_id
        AND players.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM partnerships
      INNER JOIN players ON players.id IN (partnerships.owner_player_id, partnerships.partner_player_id)
      WHERE partnerships.id = activity_events.partnership_id
        AND players.auth_user_id = auth.uid()
    )
  );
