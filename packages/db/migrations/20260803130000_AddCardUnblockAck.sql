CREATE TABLE IF NOT EXISTS "card_unblock_ack" (
	"id" bigserial PRIMARY KEY,
	"publicId" varchar(12) NOT NULL,
	"mattermostUserId" varchar(64) NOT NULL,
	"messageText" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"lastRemindedAt" timestamp,
	"confirmedAt" timestamp,
	CONSTRAINT "card_unblock_ack_publicId_unique" UNIQUE("publicId")
);
--> statement-breakpoint
ALTER TABLE "card_unblock_ack" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "card_unblock_ack_due_idx" ON "card_unblock_ack" ("confirmedAt","lastRemindedAt","createdAt");
