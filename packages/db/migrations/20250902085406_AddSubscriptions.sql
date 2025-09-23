CREATE TABLE IF NOT EXISTS "subscription" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"plan" varchar(255) NOT NULL,
	"referenceId" varchar(12) NOT NULL,
	"stripeCustomerId" varchar(255),
	"stripeSubscriptionId" varchar(255),
	"status" varchar(255) NOT NULL,
	"periodStart" timestamp,
	"periodEnd" timestamp,
	"cancelAtPeriodEnd" boolean,
	"seats" integer,
	"trialStart" timestamp,
	"trialEnd" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscription" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscription" ADD CONSTRAINT "subscription_referenceId_workspace_publicId_fk" FOREIGN KEY ("referenceId") REFERENCES "public"."workspace"("publicId") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
