CREATE EXTENSION IF NOT EXISTS pg_cron;

DROP POLICY IF EXISTS convention_cards_delete_owner ON public.convention_cards;
REVOKE DELETE ON public.convention_cards FROM anon;
REVOKE DELETE ON public.convention_cards FROM authenticated;

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC;

CREATE TABLE IF NOT EXISTS app_private.convention_card_deletion_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cleanup_run_id uuid NOT NULL,
  card_id uuid NOT NULL,
  owner_player_id uuid NOT NULL,
  archived_at timestamptz NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  share_links_deleted integer NOT NULL,
  activity_events_deleted integer NOT NULL,
  source_card_references_cleared integer NOT NULL
);

CREATE INDEX IF NOT EXISTS convention_card_deletion_log_card_id_idx
  ON app_private.convention_card_deletion_log (card_id);
CREATE INDEX IF NOT EXISTS convention_card_deletion_log_cleanup_run_id_idx
  ON app_private.convention_card_deletion_log (cleanup_run_id);
CREATE INDEX IF NOT EXISTS convention_card_deletion_log_deleted_at_idx
  ON app_private.convention_card_deletion_log (deleted_at);

ALTER TABLE app_private.convention_card_deletion_log ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE app_private.convention_card_deletion_log IS
  'Durable audit records for convention cards permanently removed by the retention job. Card and owner IDs intentionally have no foreign keys.';

CREATE OR REPLACE FUNCTION app_private.purge_archived_convention_cards(p_batch_size integer DEFAULT 500)
RETURNS TABLE (
  deleted_card_id uuid,
  deleted_share_links integer,
  deleted_activity_events integer,
  cleared_source_card_references integer,
  deletion_timestamp timestamptz
)
LANGUAGE plpgsql
SET search_path = pg_catalog, public, app_private
AS $function$
DECLARE
  candidate record;
  run_id uuid := gen_random_uuid();
BEGIN
  IF p_batch_size < 1 OR p_batch_size > 5000 THEN
    RAISE EXCEPTION 'p_batch_size must be between 1 and 5000';
  END IF;

  FOR candidate IN
    SELECT cards.id, cards.owner_player_id, cards.archived_at
    FROM public.convention_cards AS cards
    WHERE cards.status = 'archived'
      AND cards.archived_at < clock_timestamp() - interval '60 days'
    ORDER BY cards.archived_at, cards.id
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  LOOP
    SELECT count(*)::integer
    INTO deleted_share_links
    FROM public.share_links
    WHERE card_id = candidate.id;

    SELECT count(*)::integer
    INTO deleted_activity_events
    FROM public.activity_events
    WHERE card_id = candidate.id;

    SELECT count(*)::integer
    INTO cleared_source_card_references
    FROM public.convention_cards
    WHERE source_card_id = candidate.id;

    deleted_card_id := NULL;
    deletion_timestamp := clock_timestamp();

    DELETE FROM public.convention_cards
    WHERE id = candidate.id
      AND status = 'archived'
      AND archived_at < deletion_timestamp - interval '60 days'
    RETURNING id INTO deleted_card_id;

    IF deleted_card_id IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO app_private.convention_card_deletion_log (
      cleanup_run_id,
      card_id,
      owner_player_id,
      archived_at,
      deleted_at,
      share_links_deleted,
      activity_events_deleted,
      source_card_references_cleared
    )
    VALUES (
      run_id,
      deleted_card_id,
      candidate.owner_player_id,
      candidate.archived_at,
      deletion_timestamp,
      deleted_share_links,
      deleted_activity_events,
      cleared_source_card_references
    );

    RETURN NEXT;
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION app_private.purge_archived_convention_cards(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.purge_archived_convention_cards(integer) FROM anon;
REVOKE ALL ON FUNCTION app_private.purge_archived_convention_cards(integer) FROM authenticated;

SELECT cron.schedule(
  'purge-archived-convention-cards-daily',
  '15 3 * * *',
  'SELECT app_private.purge_archived_convention_cards(500);'
);
