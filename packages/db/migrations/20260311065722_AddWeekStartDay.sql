-- Migrations and snapshots seem to have become out of sync (this should fix that)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'source'
      AND e.enumlabel = 'github'
  ) THEN
    ALTER TYPE "public"."source" ADD VALUE 'github';
  END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspace_webhooks" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"publicId" varchar(12) NOT NULL,
	"workspaceId" bigint NOT NULL,
	"name" varchar(255) NOT NULL,
	"url" varchar(2048) NOT NULL,
	"secret" text,
	"events" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"createdBy" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	CONSTRAINT "workspace_webhooks_publicId_unique" UNIQUE("publicId")
);
--> statement-breakpoint
ALTER TABLE "workspace_webhooks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "integration" ALTER COLUMN "accessToken" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "card_activity" ADD COLUMN IF NOT EXISTS "attachmentId" bigint;--> statement-breakpoint
--> statement-breakpoint
ALTER TABLE "workspace" ADD COLUMN IF NOT EXISTS "weekStartDay" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace_webhooks" ADD CONSTRAINT "workspace_webhooks_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace_webhooks" ADD CONSTRAINT "workspace_webhooks_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workspace_webhooks_workspace_idx" ON "workspace_webhooks" USING btree ("workspaceId");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "card_activity" ADD CONSTRAINT "card_activity_attachmentId_card_attachment_id_fk" FOREIGN KEY ("attachmentId") REFERENCES "public"."card_attachment"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
