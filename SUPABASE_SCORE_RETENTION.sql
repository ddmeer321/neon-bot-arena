-- Run once in the Supabase SQL Editor before publishing the matching
-- privacy statement. Existing scores start their 12-month period when this
-- migration is applied because older rows may not have a reliable timestamp.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

ALTER TABLE public.scores
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

UPDATE public.scores
   SET created_at = now()
 WHERE created_at IS NULL;

ALTER TABLE public.scores
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS scores_created_at_idx
  ON public.scores (created_at);

DO $$
DECLARE
  existing_job_id BIGINT;
BEGIN
  SELECT jobid
    INTO existing_job_id
    FROM cron.job
   WHERE jobname = 'delete-expired-neon-scores';

  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;
END
$$;

SELECT cron.schedule(
  'delete-expired-neon-scores',
  '17 3 * * *',
  $$DELETE FROM public.scores WHERE created_at < now() - interval '12 months'$$
);

-- Verification queries:
SELECT jobid, jobname, schedule, command, active
  FROM cron.job
 WHERE jobname = 'delete-expired-neon-scores';

SELECT count(*) AS scores_without_created_at
  FROM public.scores
 WHERE created_at IS NULL;
