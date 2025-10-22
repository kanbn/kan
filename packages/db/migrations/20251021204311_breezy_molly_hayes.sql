ALTER TABLE "label" ALTER COLUMN "colourCode" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "motoristaColeta" varchar;--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "motoristaEntrega" varchar;