ALTER TABLE "board" ADD COLUMN "isArchived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "board_is_archived_idx" ON "board" USING btree ("isArchived");