ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "timezone" varchar(64);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "card_overdue_nudge" (
	"id" bigserial PRIMARY KEY,
	"cardId" bigint NOT NULL,
	"userId" uuid,
	"nudgeDate" date NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "card_overdue_nudge" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "card_overdue_nudge" ADD CONSTRAINT "card_overdue_nudge_cardId_card_id_fk" FOREIGN KEY ("cardId") REFERENCES "public"."card"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "card_overdue_nudge" ADD CONSTRAINT "card_overdue_nudge_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "card_overdue_nudge_card_user_date_idx" ON "card_overdue_nudge" ("cardId","userId","nudgeDate");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "card_overdue_nudge_card_idx" ON "card_overdue_nudge" ("cardId");
