ALTER TYPE "public"."card_activity_type" ADD VALUE 'card.unarchived';--> statement-breakpoint
ALTER TYPE "public"."card_activity_type" ADD VALUE 'card.deleted';--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "archivedAt" timestamp;--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "archivedBy" uuid;--> statement-breakpoint
ALTER TABLE "card" ADD CONSTRAINT "card_archivedBy_user_id_fk" FOREIGN KEY ("archivedBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "card_archived_at_idx" ON "card" USING btree ("archivedAt") WHERE "card"."archivedAt" is not null;