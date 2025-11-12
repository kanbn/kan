ALTER TYPE "public"."card_activity_type" ADD VALUE 'card.updated.attachment.added' BEFORE 'card.archived';--> statement-breakpoint
ALTER TYPE "public"."card_activity_type" ADD VALUE 'card.updated.attachment.removed' BEFORE 'card.archived';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "card_attachment" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"publicId" varchar(12) NOT NULL,
	"cardId" bigint NOT NULL,
	"filename" varchar(255) NOT NULL,
	"originalFilename" varchar(255) NOT NULL,
	"contentType" varchar(100) NOT NULL,
	"size" bigint NOT NULL,
	"s3Key" varchar(500) NOT NULL,
	"createdBy" uuid,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp,
	CONSTRAINT "card_attachment_publicId_unique" UNIQUE("publicId")
);
--> statement-breakpoint
ALTER TABLE "card_attachment" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "card_attachment" ADD CONSTRAINT "card_attachment_cardId_card_id_fk" FOREIGN KEY ("cardId") REFERENCES "public"."card"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "card_attachment" ADD CONSTRAINT "card_attachment_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
