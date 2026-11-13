ALTER TABLE "subscription" ADD COLUMN "cancelAt" timestamp;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "canceledAt" timestamp;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "endedAt" timestamp;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "billingInterval" varchar(255);--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "stripeScheduleId" varchar(255);