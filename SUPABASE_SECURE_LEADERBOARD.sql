-- Run once in the Supabase SQL Editor before deploying submit-score.
-- Public clients keep SELECT access but can no longer INSERT, UPDATE, or DELETE.

ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'scores'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.scores', policy_record.policyname);
  END LOOP;
END
$$;

REVOKE ALL ON TABLE public.scores FROM anon, authenticated;
GRANT SELECT ON TABLE public.scores TO anon, authenticated;

CREATE POLICY scores_public_read
  ON public.scores
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.score_submission_limits (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  client_hash TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

REVOKE ALL ON TABLE private.score_submission_limits FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS score_submission_limits_client_time_idx
  ON private.score_submission_limits (client_hash, submitted_at DESC);

CREATE OR REPLACE FUNCTION public.submit_score_secure(
  p_name TEXT,
  p_scores INTEGER,
  p_wave INTEGER,
  p_diffculty TEXT,
  p_bosses INTEGER,
  p_hero TEXT,
  p_player_count SMALLINT,
  p_client_hash TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  normalized_name TEXT := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  max_score BIGINT;
  recent_submissions INTEGER;
BEGIN
  IF p_scores IS NULL
     OR p_wave IS NULL
     OR p_bosses IS NULL
     OR p_player_count IS NULL
     OR p_diffculty IS NULL
     OR p_hero IS NULL
     OR p_client_hash IS NULL
     OR char_length(normalized_name) NOT BETWEEN 1 AND 16
     OR lower(normalized_name) = 'code24'
     OR normalized_name ~ '[[:cntrl:]<>]' THEN
    RAISE EXCEPTION 'invalid player name';
  END IF;

  IF p_wave NOT BETWEEN 1 AND 500
     OR p_bosses NOT BETWEEN 0 AND 200
     OR p_player_count NOT BETWEEN 1 AND 3
     OR p_diffculty NOT IN ('easy', 'normal', 'hard')
     OR p_hero NOT IN (
       'Volt Runner',
       'Shield Titan',
       'Nova Shade',
       'Ember Forge',
       'Frost Byte',
       'Pulse Monk',
       'Iron Warden'
     )
     OR p_client_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'invalid score fields';
  END IF;

  max_score := 5000
    + p_wave::BIGINT * 1200
    + p_wave::BIGINT * p_wave::BIGINT * 70
    + p_bosses::BIGINT * 1200;

  IF p_scores < 0 OR p_scores > max_score THEN
    RAISE EXCEPTION 'implausible score';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_client_hash, 0));

  SELECT count(*)
    INTO recent_submissions
    FROM private.score_submission_limits
   WHERE client_hash = p_client_hash
     AND submitted_at > now() - interval '10 minutes';

  IF recent_submissions >= 5 THEN
    RAISE EXCEPTION 'rate limit exceeded';
  END IF;

  INSERT INTO private.score_submission_limits (client_hash)
  VALUES (p_client_hash);

  DELETE FROM private.score_submission_limits
   WHERE submitted_at < now() - interval '1 day';

  INSERT INTO public.scores (
    name,
    scores,
    wave,
    diffculty,
    bosses,
    hero,
    player_count
  )
  VALUES (
    normalized_name,
    p_scores,
    p_wave,
    p_diffculty,
    p_bosses,
    p_hero,
    p_player_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_score_secure(
  TEXT,
  INTEGER,
  INTEGER,
  TEXT,
  INTEGER,
  TEXT,
  SMALLINT,
  TEXT
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.submit_score_secure(
  TEXT,
  INTEGER,
  INTEGER,
  TEXT,
  INTEGER,
  TEXT,
  SMALLINT,
  TEXT
) TO service_role;

-- Verification queries:
SELECT relrowsecurity
  FROM pg_class
 WHERE oid = 'public.scores'::regclass;

SELECT grantee, privilege_type
  FROM information_schema.role_table_grants
 WHERE table_schema = 'public'
   AND table_name = 'scores'
   AND grantee IN ('anon', 'authenticated')
 ORDER BY grantee, privilege_type;

SELECT policyname, cmd, roles
  FROM pg_policies
 WHERE schemaname = 'public'
   AND tablename = 'scores';
