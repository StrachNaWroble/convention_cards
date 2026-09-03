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
      INNER JOIN players
        ON players.id IN (partnerships.owner_player_id, partnerships.partner_player_id)
        OR players.wbf_number = partnerships.partner_wbf_number
      WHERE partnerships.id = activity_events.partnership_id
        AND players.auth_user_id = auth.uid()
    )
  );
