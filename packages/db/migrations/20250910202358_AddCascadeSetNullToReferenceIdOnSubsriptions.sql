ALTER TABLE "subscription" DROP CONSTRAINT "subscription_referenceId_workspace_publicId_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscription" ADD CONSTRAINT "subscription_referenceId_workspace_publicId_fk" FOREIGN KEY ("referenceId") REFERENCES "public"."workspace"("publicId") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
