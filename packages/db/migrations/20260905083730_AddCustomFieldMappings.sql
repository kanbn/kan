CREATE TABLE IF NOT EXISTS "custom_field_mapping" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"sourceFieldId" bigint NOT NULL,
	"targetBoardId" bigint NOT NULL,
	"targetFieldId" bigint NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"createdBy" uuid,
	CONSTRAINT "custom_field_mapping_source_board_unique" UNIQUE("sourceFieldId","targetBoardId")
);
--> statement-breakpoint
ALTER TABLE "custom_field_mapping" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "custom_field_option_mapping" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"sourceOptionId" bigint NOT NULL,
	"targetFieldId" bigint NOT NULL,
	"targetOptionId" bigint NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"createdBy" uuid,
	CONSTRAINT "custom_field_option_mapping_source_field_unique" UNIQUE("sourceOptionId","targetFieldId")
);
--> statement-breakpoint
ALTER TABLE "custom_field_option_mapping" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "custom_field" ADD CONSTRAINT "custom_field_id_board_unique" UNIQUE("id","boardId");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_field_mapping" ADD CONSTRAINT "custom_field_mapping_sourceFieldId_custom_field_id_fk" FOREIGN KEY ("sourceFieldId") REFERENCES "public"."custom_field"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_field_mapping" ADD CONSTRAINT "custom_field_mapping_targetBoardId_board_id_fk" FOREIGN KEY ("targetBoardId") REFERENCES "public"."board"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_field_mapping" ADD CONSTRAINT "custom_field_mapping_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_field_mapping" ADD CONSTRAINT "custom_field_mapping_target_field_board_fk" FOREIGN KEY ("targetFieldId","targetBoardId") REFERENCES "public"."custom_field"("id","boardId") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_field_option_mapping" ADD CONSTRAINT "custom_field_option_mapping_sourceOptionId_custom_field_option_id_fk" FOREIGN KEY ("sourceOptionId") REFERENCES "public"."custom_field_option"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_field_option_mapping" ADD CONSTRAINT "custom_field_option_mapping_targetFieldId_custom_field_id_fk" FOREIGN KEY ("targetFieldId") REFERENCES "public"."custom_field"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_field_option_mapping" ADD CONSTRAINT "custom_field_option_mapping_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_field_option_mapping" ADD CONSTRAINT "custom_field_option_mapping_target_option_field_fk" FOREIGN KEY ("targetOptionId","targetFieldId") REFERENCES "public"."custom_field_option"("id","customFieldId") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
