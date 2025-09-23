CREATE TYPE "public"."invite_link_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspace_invite_links" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"publicId" varchar(12) NOT NULL,
	"workspaceId" bigint NOT NULL,
	"code" varchar(12) NOT NULL,
	"status" "invite_link_status" DEFAULT 'active' NOT NULL,
	"expiresAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"createdBy" uuid,
	"updatedAt" timestamp,
	"updatedBy" uuid,
	CONSTRAINT "workspace_invite_links_publicId_unique" UNIQUE("publicId"),
	CONSTRAINT "workspace_invite_links_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "workspace_invite_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace_invite_links" ADD CONSTRAINT "workspace_invite_links_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace_invite_links" ADD CONSTRAINT "workspace_invite_links_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace_invite_links" ADD CONSTRAINT "workspace_invite_links_updatedBy_user_id_fk" FOREIGN KEY ("updatedBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
