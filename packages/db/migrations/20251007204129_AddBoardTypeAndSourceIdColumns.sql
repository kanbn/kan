CREATE TYPE "public"."board_type" AS ENUM('regular', 'template');--> statement-breakpoint
ALTER TABLE "board" ADD COLUMN "type" "board_type" DEFAULT 'regular' NOT NULL;--> statement-breakpoint
ALTER TABLE "board" ADD COLUMN "sourceBoardId" bigint;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "board_type_idx" ON "board" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "board_source_idx" ON "board" USING btree ("sourceBoardId");