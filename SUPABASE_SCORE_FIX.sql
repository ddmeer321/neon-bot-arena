-- Run once in the Supabase SQL Editor.
-- Fixes HTTP 409 when two players achieve the same score.
-- The numeric score value must not be globally UNIQUE.

DO $$
DECLARE
  score_column SMALLINT;
  unique_constraint RECORD;
  unique_index RECORD;
BEGIN
  SELECT attnum
    INTO score_column
    FROM pg_attribute
   WHERE attrelid = 'public.scores'::regclass
     AND attname = 'scores'
     AND NOT attisdropped;

  IF score_column IS NULL THEN
    RAISE EXCEPTION 'Column public.scores.scores was not found';
  END IF;

  FOR unique_constraint IN
    SELECT conname
      FROM pg_constraint
     WHERE conrelid = 'public.scores'::regclass
       AND contype = 'u'
       AND conkey = ARRAY[score_column]
  LOOP
    EXECUTE format(
      'ALTER TABLE public.scores DROP CONSTRAINT %I',
      unique_constraint.conname
    );
    RAISE NOTICE 'Removed UNIQUE constraint %', unique_constraint.conname;
  END LOOP;

  -- Also handle a manually-created unique index that is not backed by a constraint.
  FOR unique_index IN
    SELECT index_class.relname AS index_name
      FROM pg_index index_info
      JOIN pg_class index_class ON index_class.oid = index_info.indexrelid
      LEFT JOIN pg_constraint constraint_info ON constraint_info.conindid = index_info.indexrelid
     WHERE index_info.indrelid = 'public.scores'::regclass
       AND index_info.indisunique
       AND NOT index_info.indisprimary
       AND constraint_info.oid IS NULL
       AND index_info.indnkeyatts = 1
       AND index_info.indkey[0] = score_column
  LOOP
    EXECUTE format('DROP INDEX public.%I', unique_index.index_name);
    RAISE NOTICE 'Removed UNIQUE index %', unique_index.index_name;
  END LOOP;
END
$$;

-- Verification: this query must return no row.
SELECT conname, pg_get_constraintdef(oid)
  FROM pg_constraint
 WHERE conrelid = 'public.scores'::regclass
   AND contype = 'u'
   AND conkey = ARRAY[
     (SELECT attnum
        FROM pg_attribute
       WHERE attrelid = 'public.scores'::regclass
         AND attname = 'scores'
         AND NOT attisdropped)
   ];
