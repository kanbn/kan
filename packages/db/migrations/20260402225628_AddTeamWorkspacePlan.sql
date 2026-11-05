DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'workspace_plan'
      AND e.enumlabel = 'team'
  ) THEN
    ALTER TYPE "public"."workspace_plan" ADD VALUE 'team' BEFORE 'pro';
  END IF;
END $$;