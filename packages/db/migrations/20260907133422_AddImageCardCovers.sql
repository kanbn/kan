ALTER TABLE "card" ADD COLUMN "coverAttachmentId" bigint;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "card" ADD CONSTRAINT "card_coverAttachmentId_card_attachment_id_fk" FOREIGN KEY ("coverAttachmentId") REFERENCES "public"."card_attachment"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "card_cover_attachment_idx" ON "card" USING btree ("coverAttachmentId");--> statement-breakpoint
ALTER TABLE "card" ADD CONSTRAINT "card_cover_source_check" CHECK ("card"."coverColourCode" IS NULL OR "card"."coverAttachmentId" IS NULL);