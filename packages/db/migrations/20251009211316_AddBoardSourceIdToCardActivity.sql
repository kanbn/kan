ALTER TABLE "card_activity" ADD COLUMN "sourceBoardId" bigint;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "card_activity" ADD CONSTRAINT "card_activity_sourceBoardId_board_id_fk" FOREIGN KEY ("sourceBoardId") REFERENCES "public"."board"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
