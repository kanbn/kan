ALTER TABLE "subscription" ADD COLUMN "partnerLicenseKey" varchar(255);--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "partnerTier" integer;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_partner_license_key_idx" ON "subscription" USING btree ("partnerLicenseKey");