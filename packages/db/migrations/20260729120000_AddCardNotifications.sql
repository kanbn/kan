DO $$ BEGIN
 CREATE TYPE "public"."card_notification_channel" AS ENUM('mattermost', 'google_calendar');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."card_notification_trigger" AS ENUM('relative', 'absolute');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."card_notification_offset_unit" AS ENUM('minutes', 'hours', 'days');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "card_notification" (
	"id" bigserial PRIMARY KEY,
	"publicId" varchar(12) NOT NULL,
	"cardId" bigint NOT NULL,
	"channel" "card_notification_channel" NOT NULL,
	"triggerType" "card_notification_trigger" NOT NULL,
	"offsetValue" integer,
	"offsetUnit" "card_notification_offset_unit",
	"triggerAt" timestamp,
	"timeOfDay" varchar(5) NOT NULL DEFAULT '09:00',
	"timezone" varchar(64),
	"deliveredAt" timestamp,
	"createdBy" uuid,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	"deletedAt" timestamp,
	CONSTRAINT "card_notification_publicId_unique" UNIQUE("publicId")
);
--> statement-breakpoint
ALTER TABLE "card_notification" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "card_notification" ADD CONSTRAINT "card_notification_cardId_card_id_fk" FOREIGN KEY ("cardId") REFERENCES "public"."card"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "card_notification" ADD CONSTRAINT "card_notification_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "card_notification_channel_delivered_idx" ON "card_notification" ("channel","deliveredAt","deletedAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "card_notification_card_deleted_idx" ON "card_notification" ("cardId","deletedAt");
