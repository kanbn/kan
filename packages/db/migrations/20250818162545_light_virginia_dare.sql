CREATE TYPE "public"."custom_field_type" AS ENUM('text', 'link', 'date', 'checkbox', 'emoji', 'user');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "custom_field_definition" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"publicId" varchar(12) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"type" "custom_field_type" NOT NULL,
	"isRequired" boolean DEFAULT false NOT NULL,
	"boardId" bigint NOT NULL,
	"createdBy" uuid,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	"deletedAt" timestamp,
	"deletedBy" uuid,
	CONSTRAINT "custom_field_definition_publicId_unique" UNIQUE("publicId")
);
--> statement-breakpoint
ALTER TABLE "custom_field_definition" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "custom_field_value" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"publicId" varchar(12) NOT NULL,
	"cardId" bigint NOT NULL,
	"fieldDefinitionId" bigint NOT NULL,
	"textValue" text,
	"linkValue" text,
	"dateValue" date,
	"checkboxValue" boolean,
	"emojiValue" varchar(10),
	"userValue" bigint,
	"createdBy" uuid,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	"deletedAt" timestamp,
	"deletedBy" uuid,
	CONSTRAINT "custom_field_value_publicId_unique" UNIQUE("publicId")
);
--> statement-breakpoint
ALTER TABLE "custom_field_value" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_field_definition" ADD CONSTRAINT "custom_field_definition_boardId_board_id_fk" FOREIGN KEY ("boardId") REFERENCES "public"."board"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_field_definition" ADD CONSTRAINT "custom_field_definition_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_field_definition" ADD CONSTRAINT "custom_field_definition_deletedBy_user_id_fk" FOREIGN KEY ("deletedBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_field_value" ADD CONSTRAINT "custom_field_value_cardId_card_id_fk" FOREIGN KEY ("cardId") REFERENCES "public"."card"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_field_value" ADD CONSTRAINT "custom_field_value_fieldDefinitionId_custom_field_definition_id_fk" FOREIGN KEY ("fieldDefinitionId") REFERENCES "public"."custom_field_definition"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_field_value" ADD CONSTRAINT "custom_field_value_userValue_workspace_members_id_fk" FOREIGN KEY ("userValue") REFERENCES "public"."workspace_members"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_field_value" ADD CONSTRAINT "custom_field_value_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_field_value" ADD CONSTRAINT "custom_field_value_deletedBy_user_id_fk" FOREIGN KEY ("deletedBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
