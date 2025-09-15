CREATE TYPE "public"."tipoEntrega" AS ENUM('normal', 'express');--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "hospedeName" varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "hospedeDocumento" varchar(30) NOT NULL;--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "hospedeTelefone" varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "tipoEntrega" "tipoEntrega" NOT NULL;