ALTER TYPE "public"."source" ADD VALUE 'github';--> statement-breakpoint
ALTER TABLE "integration" ALTER COLUMN "accessToken" SET DATA TYPE text;--> statement-breakpoint