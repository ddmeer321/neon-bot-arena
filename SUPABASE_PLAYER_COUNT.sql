-- Run once in the Supabase SQL Editor.
-- Adds separate solo / multiplayer leaderboard support.

ALTER TABLE public.scores
  ADD COLUMN IF NOT EXISTS player_count SMALLINT;

UPDATE public.scores
   SET player_count = 1
 WHERE player_count IS NULL;

ALTER TABLE public.scores
  ALTER COLUMN player_count SET DEFAULT 1,
  ALTER COLUMN player_count SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.scores'::regclass
       AND conname = 'scores_player_count_check'
  ) THEN
    ALTER TABLE public.scores
      ADD CONSTRAINT scores_player_count_check
      CHECK (player_count BETWEEN 1 AND 3);
  END IF;
END
$$;

-- Only these two confirmed scores above 200,000 were achieved with two players.
UPDATE public.scores
   SET player_count = 2
 WHERE lower(btrim(name)) IN ('niklas', 'spieler')
   AND scores > 200000;

CREATE INDEX IF NOT EXISTS scores_player_count_scores_idx
  ON public.scores (player_count, scores DESC);

-- Verification: should return exactly the two confirmed records.
SELECT name, scores, player_count
  FROM public.scores
 WHERE lower(btrim(name)) IN ('niklas', 'spieler')
   AND scores > 200000
 ORDER BY scores DESC;
