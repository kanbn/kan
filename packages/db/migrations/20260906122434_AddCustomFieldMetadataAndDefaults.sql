CREATE TABLE IF NOT EXISTS "custom_field_default_value" (
	"customFieldId" bigint PRIMARY KEY NOT NULL,
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
	CONSTRAINT "custom_field_default_value_shape_check" CHECK ((
        "custom_field_default_value"."fieldType" = 'text'
        AND "custom_field_default_value"."textValue" IS NOT NULL
        AND "custom_field_default_value"."numberValue" IS NULL
        AND "custom_field_default_value"."dateValue" IS NULL
        AND "custom_field_default_value"."checkboxValue" IS NULL
        AND "custom_field_default_value"."optionId" IS NULL
      ) OR (
        "custom_field_default_value"."fieldType" = 'number'
        AND "custom_field_default_value"."textValue" IS NULL
        AND "custom_field_default_value"."numberValue" IS NOT NULL
        AND "custom_field_default_value"."dateValue" IS NULL
        AND "custom_field_default_value"."checkboxValue" IS NULL
        AND "custom_field_default_value"."optionId" IS NULL
      ) OR (
        "custom_field_default_value"."fieldType" = 'date'
        AND "custom_field_default_value"."textValue" IS NULL
        AND "custom_field_default_value"."numberValue" IS NULL
        AND "custom_field_default_value"."dateValue" IS NOT NULL
        AND "custom_field_default_value"."checkboxValue" IS NULL
        AND "custom_field_default_value"."optionId" IS NULL
      ) OR (
        "custom_field_default_value"."fieldType" = 'checkbox'
        AND "custom_field_default_value"."textValue" IS NULL
        AND "custom_field_default_value"."numberValue" IS NULL
        AND "custom_field_default_value"."dateValue" IS NULL
        AND "custom_field_default_value"."checkboxValue" IS NOT NULL
        AND "custom_field_default_value"."optionId" IS NULL
      ) OR (
        "custom_field_default_value"."fieldType" = 'select'
        AND "custom_field_default_value"."textValue" IS NULL
        AND "custom_field_default_value"."numberValue" IS NULL
        AND "custom_field_default_value"."dateValue" IS NULL
        AND "custom_field_default_value"."checkboxValue" IS NULL
        AND "custom_field_default_value"."optionId" IS NOT NULL
      ))
);
--> statement-breakpoint
ALTER TABLE "custom_field_default_value" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "custom_field" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "custom_field" ADD COLUMN "placeholder" varchar(255);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_field_default_value" ADD CONSTRAINT "custom_field_default_value_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_field_default_value" ADD CONSTRAINT "custom_field_default_value_updatedBy_user_id_fk" FOREIGN KEY ("updatedBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_field_default_value" ADD CONSTRAINT "custom_field_default_value_field_type_fk" FOREIGN KEY ("customFieldId","fieldType") REFERENCES "public"."custom_field"("id","type") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_field_default_value" ADD CONSTRAINT "custom_field_default_value_option_field_fk" FOREIGN KEY ("optionId","customFieldId") REFERENCES "public"."custom_field_option"("id","customFieldId") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
