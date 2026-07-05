-- LOCAL PREPARATION ONLY.
-- Run this in the Supabase SQL Editor only when the matching Edge Function
-- and frontend are ready to be deployed together.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.scores
  ADD COLUMN IF NOT EXISTS public_id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS delete_token_hash TEXT;

UPDATE public.scores
   SET public_id = gen_random_uuid()
 WHERE public_id IS NULL;

ALTER TABLE public.scores
  ALTER COLUMN public_id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN public_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS scores_public_id_idx
  ON public.scores (public_id);

-- RLS controls rows. Column privileges ensure public clients can only read
-- harmless leaderboard fields and never deletion or internal identifiers.
REVOKE SELECT ON TABLE public.scores FROM anon, authenticated;
GRANT SELECT (
  name,
  scores,
  wave,
  diffculty,
  bosses,
  hero,
  player_count
) ON TABLE public.scores TO anon, authenticated;

CREATE TABLE IF NOT EXISTS private.score_deletion_limits (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  client_hash TEXT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

REVOKE ALL ON TABLE private.score_deletion_limits FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS score_deletion_limits_client_time_idx
  ON private.score_deletion_limits (client_hash, attempted_at DESC);

CREATE OR REPLACE FUNCTION public.submit_score_secure_v2(
  p_name TEXT,
  p_scores INTEGER,
  p_wave INTEGER,
  p_diffculty TEXT,
  p_bosses INTEGER,
  p_hero TEXT,
  p_player_count SMALLINT,
  p_client_hash TEXT,
  p_delete_token_hash TEXT
)
RETURNS TABLE(score_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  normalized_name TEXT := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  max_score BIGINT;
  recent_submissions INTEGER;
  inserted_score_id UUID;
BEGIN
  IF p_scores IS NULL
     OR p_wave IS NULL
     OR p_bosses IS NULL
     OR p_player_count IS NULL
     OR p_diffculty IS NULL
     OR p_hero IS NULL
     OR p_client_hash IS NULL
     OR p_delete_token_hash IS NULL
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
     OR p_client_hash !~ '^[0-9a-f]{64}$'
     OR p_delete_token_hash !~ '^[0-9a-f]{64}$' THEN
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
    player_count,
    delete_token_hash
  )
  VALUES (
    normalized_name,
    p_scores,
    p_wave,
    p_diffculty,
    p_bosses,
    p_hero,
    p_player_count,
    p_delete_token_hash
  )
  RETURNING public_id INTO inserted_score_id;

  RETURN QUERY SELECT inserted_score_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_score_secure(
  p_score_id UUID,
  p_delete_token_hash TEXT,
  p_client_hash TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  recent_attempts INTEGER;
  deleted_rows INTEGER;
BEGIN
  IF p_score_id IS NULL
     OR p_delete_token_hash IS NULL
     OR p_client_hash IS NULL
     OR p_delete_token_hash !~ '^[0-9a-f]{64}$'
     OR p_client_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'invalid deletion fields';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_client_hash, 1));

  SELECT count(*)
    INTO recent_attempts
    FROM private.score_deletion_limits
   WHERE client_hash = p_client_hash
     AND attempted_at > now() - interval '10 minutes';

  IF recent_attempts >= 10 THEN
    RAISE EXCEPTION 'rate limit exceeded';
  END IF;

  INSERT INTO private.score_deletion_limits (client_hash)
  VALUES (p_client_hash);

  DELETE FROM private.score_deletion_limits
   WHERE attempted_at < now() - interval '1 day';

  DELETE FROM public.scores
   WHERE public_id = p_score_id
     AND delete_token_hash = p_delete_token_hash;

  GET DIAGNOSTICS deleted_rows = ROW_COUNT;
  RETURN deleted_rows = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_score_secure_v2(
  TEXT,
  INTEGER,
  INTEGER,
  TEXT,
  INTEGER,
  TEXT,
  SMALLINT,
  TEXT,
  TEXT
) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.delete_score_secure(
  UUID,
  TEXT,
  TEXT
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.submit_score_secure_v2(
  TEXT,
  INTEGER,
  INTEGER,
  TEXT,
  INTEGER,
  TEXT,
  SMALLINT,
  TEXT,
  TEXT
) TO service_role;

GRANT EXECUTE ON FUNCTION public.delete_score_secure(
  UUID,
  TEXT,
  TEXT
) TO service_role;

-- Expected public privileges after applying:
SELECT grantee, privilege_type, column_name
  FROM information_schema.column_privileges
 WHERE table_schema = 'public'
   AND table_name = 'scores'
   AND grantee IN ('anon', 'authenticated')
 ORDER BY grantee, column_name;
