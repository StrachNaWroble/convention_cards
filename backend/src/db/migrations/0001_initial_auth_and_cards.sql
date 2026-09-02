CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'unverified', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE partnership_status AS ENUM ('pending', 'approved', 'declined', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE card_status AS ENUM ('draft', 'pending_partner_approval', 'active', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  wbf_number text NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  display_name text,
  country_or_nbo text,
  verification_status verification_status NOT NULL DEFAULT 'pending',
  verification_source text,
  verification_checked_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS players_wbf_number_idx ON players (wbf_number);
CREATE UNIQUE INDEX IF NOT EXISTS players_email_idx ON players (email);
CREATE UNIQUE INDEX IF NOT EXISTS players_auth_user_id_idx ON players (auth_user_id);

CREATE TABLE IF NOT EXISTS partnerships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  partner_player_id uuid REFERENCES players(id) ON DELETE SET NULL,
  partner_wbf_number text NOT NULL,
  status partnership_status NOT NULL DEFAULT 'pending',
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partnerships_owner_player_id_idx ON partnerships (owner_player_id);
CREATE INDEX IF NOT EXISTS partnerships_partner_player_id_idx ON partnerships (partner_player_id);

CREATE TABLE IF NOT EXISTS convention_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  partnership_id uuid REFERENCES partnerships(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'Untitled card',
  status card_status NOT NULL DEFAULT 'draft',
  card_data jsonb NOT NULL,
  submitted_at timestamptz,
  activated_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS convention_cards_owner_player_id_idx ON convention_cards (owner_player_id);
CREATE INDEX IF NOT EXISTS convention_cards_partnership_id_idx ON convention_cards (partnership_id);
CREATE INDEX IF NOT EXISTS convention_cards_status_idx ON convention_cards (status);

CREATE TABLE IF NOT EXISTS card_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  card_data jsonb NOT NULL,
  is_system_template boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS card_templates_slug_idx ON card_templates (slug);

CREATE TABLE IF NOT EXISTS share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES convention_cards(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS share_links_card_id_idx ON share_links (card_id);
CREATE UNIQUE INDEX IF NOT EXISTS share_links_token_hash_idx ON share_links (token_hash);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS players_set_updated_at ON players;
CREATE TRIGGER players_set_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS partnerships_set_updated_at ON partnerships;
CREATE TRIGGER partnerships_set_updated_at
  BEFORE UPDATE ON partnerships
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS convention_cards_set_updated_at ON convention_cards;
CREATE TRIGGER convention_cards_set_updated_at
  BEFORE UPDATE ON convention_cards
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS card_templates_set_updated_at ON card_templates;
CREATE TRIGGER card_templates_set_updated_at
  BEFORE UPDATE ON card_templates
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE convention_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS players_select_own_profile ON players;
CREATE POLICY players_select_own_profile ON players
  FOR SELECT
  USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS players_insert_own_profile ON players;
CREATE POLICY players_insert_own_profile ON players
  FOR INSERT
  WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS players_update_own_profile ON players;
CREATE POLICY players_update_own_profile ON players
  FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS partnerships_select_participant ON partnerships;
CREATE POLICY partnerships_select_participant ON partnerships
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM players
      WHERE players.id IN (partnerships.owner_player_id, partnerships.partner_player_id)
        AND players.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS partnerships_insert_owner ON partnerships;
CREATE POLICY partnerships_insert_owner ON partnerships
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM players
      WHERE players.id = partnerships.owner_player_id
        AND players.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS partnerships_update_participant ON partnerships;
CREATE POLICY partnerships_update_participant ON partnerships
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM players
      WHERE players.id IN (partnerships.owner_player_id, partnerships.partner_player_id)
        AND players.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM players
      WHERE players.id IN (partnerships.owner_player_id, partnerships.partner_player_id)
        AND players.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS convention_cards_select_owner ON convention_cards;
CREATE POLICY convention_cards_select_owner ON convention_cards
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM players
      WHERE players.id = convention_cards.owner_player_id
        AND players.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS convention_cards_insert_owner ON convention_cards;
CREATE POLICY convention_cards_insert_owner ON convention_cards
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM players
      WHERE players.id = convention_cards.owner_player_id
        AND players.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS convention_cards_update_owner ON convention_cards;
CREATE POLICY convention_cards_update_owner ON convention_cards
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM players
      WHERE players.id = convention_cards.owner_player_id
        AND players.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM players
      WHERE players.id = convention_cards.owner_player_id
        AND players.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS convention_cards_delete_owner ON convention_cards;
CREATE POLICY convention_cards_delete_owner ON convention_cards
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM players
      WHERE players.id = convention_cards.owner_player_id
        AND players.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS card_templates_select_all ON card_templates;
CREATE POLICY card_templates_select_all ON card_templates
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS share_links_select_card_owner ON share_links;
CREATE POLICY share_links_select_card_owner ON share_links
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM convention_cards
      INNER JOIN players ON players.id = convention_cards.owner_player_id
      WHERE convention_cards.id = share_links.card_id
        AND players.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS share_links_insert_card_owner ON share_links;
CREATE POLICY share_links_insert_card_owner ON share_links
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM convention_cards
      INNER JOIN players ON players.id = convention_cards.owner_player_id
      WHERE convention_cards.id = share_links.card_id
        AND players.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS share_links_update_card_owner ON share_links;
CREATE POLICY share_links_update_card_owner ON share_links
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM convention_cards
      INNER JOIN players ON players.id = convention_cards.owner_player_id
      WHERE convention_cards.id = share_links.card_id
        AND players.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM convention_cards
      INNER JOIN players ON players.id = convention_cards.owner_player_id
      WHERE convention_cards.id = share_links.card_id
        AND players.auth_user_id = auth.uid()
    )
  );
