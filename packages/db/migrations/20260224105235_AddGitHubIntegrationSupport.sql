DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'source'
      AND e.enumlabel = 'github'
  ) THEN
    ALTER TYPE "public"."source" ADD VALUE 'github';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "integration" ALTER COLUMN "accessToken" SET DATA TYPE text;--> statement-breakpoint