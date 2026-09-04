CREATE TYPE "public"."custom_field_type" AS ENUM('text', 'number', 'date', 'checkbox', 'select');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "card_custom_field_value" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"publicId" varchar(12) NOT NULL,
	"cardId" bigint NOT NULL,
	"customFieldId" bigint NOT NULL,
	"fieldType" "custom_field_type" NOT NULL,
	"optionId" bigint,
	"textValue" text,
	"numberValue" numeric,
	"dateValue" timestamp with time zone,
	"checkboxValue" boolean,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"createdBy" uuid,
	"updatedAt" timestamp,
	"updatedBy" uuid,
	"importId" bigint,
	CONSTRAINT "card_custom_field_value_publicId_unique" UNIQUE("publicId"),
	CONSTRAINT "card_custom_field_value_card_field_unique" UNIQUE("cardId","customFieldId"),
	CONSTRAINT "card_custom_field_value_shape_check" CHECK ((
        "card_custom_field_value"."fieldType" = 'text'
        AND "card_custom_field_value"."textValue" IS NOT NULL
        AND "card_custom_field_value"."numberValue" IS NULL
        AND "card_custom_field_value"."dateValue" IS NULL
        AND "card_custom_field_value"."checkboxValue" IS NULL
        AND "card_custom_field_value"."optionId" IS NULL
      ) OR (
        "card_custom_field_value"."fieldType" = 'number'
        AND "card_custom_field_value"."textValue" IS NULL
        AND "card_custom_field_value"."numberValue" IS NOT NULL
        AND "card_custom_field_value"."dateValue" IS NULL
        AND "card_custom_field_value"."checkboxValue" IS NULL
        AND "card_custom_field_value"."optionId" IS NULL
      ) OR (
        "card_custom_field_value"."fieldType" = 'date'
        AND "card_custom_field_value"."textValue" IS NULL
        AND "card_custom_field_value"."numberValue" IS NULL
        AND "card_custom_field_value"."dateValue" IS NOT NULL
        AND "card_custom_field_value"."checkboxValue" IS NULL
        AND "card_custom_field_value"."optionId" IS NULL
      ) OR (
        "card_custom_field_value"."fieldType" = 'checkbox'
        AND "card_custom_field_value"."textValue" IS NULL
        AND "card_custom_field_value"."numberValue" IS NULL
        AND "card_custom_field_value"."dateValue" IS NULL
        AND "card_custom_field_value"."checkboxValue" IS NOT NULL
        AND "card_custom_field_value"."optionId" IS NULL
      ) OR (
        "card_custom_field_value"."fieldType" = 'select'
        AND "card_custom_field_value"."textValue" IS NULL
        AND "card_custom_field_value"."numberValue" IS NULL
        AND "card_custom_field_value"."dateValue" IS NULL
        AND "card_custom_field_value"."checkboxValue" IS NULL
        AND "card_custom_field_value"."optionId" IS NOT NULL
      ))
);
--> statement-breakpoint
ALTER TABLE "card_custom_field_value" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "custom_field_option" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"publicId" varchar(12) NOT NULL,
	"customFieldId" bigint NOT NULL,
	"name" varchar(255) NOT NULL,
	"colourCode" varchar(12),
	"position" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"createdBy" uuid,
	"updatedAt" timestamp,
	"updatedBy" uuid,
	"deletedAt" timestamp,
	"deletedBy" uuid,
	"importId" bigint,
	CONSTRAINT "custom_field_option_publicId_unique" UNIQUE("publicId"),
	CONSTRAINT "custom_field_option_id_field_unique" UNIQUE("id","customFieldId")
);
--> statement-breakpoint
ALTER TABLE "custom_field_option" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "custom_field" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"publicId" varchar(12) NOT NULL,
	"boardId" bigint NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "custom_field_type" NOT NULL,
	"position" integer NOT NULL,
	"showOnCard" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"createdBy" uuid,
	"updatedAt" timestamp,
	"updatedBy" uuid,
	"deletedAt" timestamp,
	"deletedBy" uuid,
	"importId" bigint,
	CONSTRAINT "custom_field_publicId_unique" UNIQUE("publicId"),
	CONSTRAINT "custom_field_id_type_unique" UNIQUE("id","type")
);
--> statement-breakpoint
ALTER TABLE "custom_field" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "card_custom_field_value" ADD CONSTRAINT "card_custom_field_value_cardId_card_id_fk" FOREIGN KEY ("cardId") REFERENCES "public"."card"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "card_custom_field_value" ADD CONSTRAINT "card_custom_field_value_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "card_custom_field_value" ADD CONSTRAINT "card_custom_field_value_updatedBy_user_id_fk" FOREIGN KEY ("updatedBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "card_custom_field_value" ADD CONSTRAINT "card_custom_field_value_importId_import_id_fk" FOREIGN KEY ("importId") REFERENCES "public"."import"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "card_custom_field_value" ADD CONSTRAINT "card_custom_field_value_field_type_fk" FOREIGN KEY ("customFieldId","fieldType") REFERENCES "public"."custom_field"("id","type") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "card_custom_field_value" ADD CONSTRAINT "card_custom_field_value_option_field_fk" FOREIGN KEY ("optionId","customFieldId") REFERENCES "public"."custom_field_option"("id","customFieldId") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_field_option" ADD CONSTRAINT "custom_field_option_customFieldId_custom_field_id_fk" FOREIGN KEY ("customFieldId") REFERENCES "public"."custom_field"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_field_option" ADD CONSTRAINT "custom_field_option_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_field_option" ADD CONSTRAINT "custom_field_option_updatedBy_user_id_fk" FOREIGN KEY ("updatedBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_field_option" ADD CONSTRAINT "custom_field_option_deletedBy_user_id_fk" FOREIGN KEY ("deletedBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_field_option" ADD CONSTRAINT "custom_field_option_importId_import_id_fk" FOREIGN KEY ("importId") REFERENCES "public"."import"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_field" ADD CONSTRAINT "custom_field_boardId_board_id_fk" FOREIGN KEY ("boardId") REFERENCES "public"."board"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_field" ADD CONSTRAINT "custom_field_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_field" ADD CONSTRAINT "custom_field_updatedBy_user_id_fk" FOREIGN KEY ("updatedBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_field" ADD CONSTRAINT "custom_field_deletedBy_user_id_fk" FOREIGN KEY ("deletedBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_field" ADD CONSTRAINT "custom_field_importId_import_id_fk" FOREIGN KEY ("importId") REFERENCES "public"."import"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "card_custom_field_value_field_option_idx" ON "card_custom_field_value" USING btree ("customFieldId","optionId") WHERE "card_custom_field_value"."optionId" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "card_custom_field_value_field_checkbox_idx" ON "card_custom_field_value" USING btree ("customFieldId","checkboxValue") WHERE "card_custom_field_value"."checkboxValue" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "custom_field_option_field_position_idx" ON "custom_field_option" USING btree ("customFieldId","position") WHERE "custom_field_option"."deletedAt" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "custom_field_board_position_idx" ON "custom_field" USING btree ("boardId","position") WHERE "custom_field"."deletedAt" IS NULL;