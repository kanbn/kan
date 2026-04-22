ALTER TABLE "card" ADD COLUMN "parentId" bigint;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "card" ADD CONSTRAINT "card_parentId_card_id_fk" FOREIGN KEY ("parentId") REFERENCES "public"."card"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
