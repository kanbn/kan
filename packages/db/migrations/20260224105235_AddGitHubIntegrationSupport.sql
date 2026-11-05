ALTER TYPE "public"."source" ADD VALUE IF NOT EXISTS 'github';--> statement-breakpoint
ALTER TABLE "integration" ALTER COLUMN "accessToken" SET DATA TYPE text;--> statement-breakpoint