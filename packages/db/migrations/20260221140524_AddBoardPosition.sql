DO $$ BEGIN
  CREATE TYPE "public"."notification_type" AS ENUM('mention', 'workspace.member.added', 'workspace.member.removed', 'workspace.role.changed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"publicId" varchar(12) NOT NULL,
	"type" "notification_type" NOT NULL,
	"userId" uuid NOT NULL,
	"cardId" bigint,
	"commentId" bigint,
	"workspaceId" bigint,
	"metadata" text,
	"readAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp,
	CONSTRAINT "notification_publicId_unique" UNIQUE("publicId")
);
--> statement-breakpoint
ALTER TABLE "notification" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
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
ALTER TABLE "board" ADD COLUMN IF NOT EXISTS "position" integer;--> statement-breakpoint
UPDATE "board" b SET "position" = sub.new_position
FROM (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY "workspaceId", "type"
    ORDER BY "createdAt" ASC
  ) - 1 AS new_position
  FROM "board" WHERE "deletedAt" IS NULL
) sub WHERE b.id = sub.id;--> statement-breakpoint
UPDATE "board" SET "position" = 0 WHERE "position" IS NULL;--> statement-breakpoint
ALTER TABLE "board" ALTER COLUMN "position" SET NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification" ADD CONSTRAINT "notification_cardId_card_id_fk" FOREIGN KEY ("cardId") REFERENCES "public"."card"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification" ADD CONSTRAINT "notification_commentId_card_comments_id_fk" FOREIGN KEY ("commentId") REFERENCES "public"."card_comments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification" ADD CONSTRAINT "notification_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
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
CREATE INDEX IF NOT EXISTS "notification_user_deleted_idx" ON "notification" USING btree ("userId","deletedAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_user_read_deleted_idx" ON "notification" USING btree ("userId","readAt","deletedAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_user_type_card_idx" ON "notification" USING btree ("userId","type","cardId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_user_type_workspace_idx" ON "notification" USING btree ("userId","type","workspaceId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_user_created_idx" ON "notification" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workspace_webhooks_workspace_idx" ON "workspace_webhooks" USING btree ("workspaceId");