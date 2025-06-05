ALTER TABLE "workspace_members" DROP CONSTRAINT "workspace_members_userId_user_id_fk";
--> statement-breakpoint
ALTER TABLE "workspace_members" DROP CONSTRAINT "workspace_members_deletedBy_user_id_fk";
--> statement-breakpoint
ALTER TABLE "workspace" DROP CONSTRAINT "workspace_createdBy_user_id_fk";
--> statement-breakpoint
ALTER TABLE "workspace" DROP CONSTRAINT "workspace_deletedBy_user_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_deletedBy_user_id_fk" FOREIGN KEY ("deletedBy") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace" ADD CONSTRAINT "workspace_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace" ADD CONSTRAINT "workspace_deletedBy_user_id_fk" FOREIGN KEY ("deletedBy") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
