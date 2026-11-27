CREATE TABLE "board_label" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"publicId" varchar(12) NOT NULL,
	"name" varchar(255) NOT NULL,
	"colourCode" varchar(12),
	"workspaceId" bigint NOT NULL,
	"createdBy" uuid,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	"deletedAt" timestamp,
	"deletedBy" uuid,
	CONSTRAINT "board_label_publicId_unique" UNIQUE("publicId")
);
--> statement-breakpoint
ALTER TABLE "board_label" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "_board_board_labels" (
	"boardId" bigint NOT NULL,
	"boardLabelId" bigint NOT NULL,
	CONSTRAINT "_board_board_labels_boardId_boardLabelId_pk" PRIMARY KEY("boardId","boardLabelId")
);
--> statement-breakpoint
ALTER TABLE "_board_board_labels" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "board_label" ADD CONSTRAINT "board_label_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_label" ADD CONSTRAINT "board_label_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_label" ADD CONSTRAINT "board_label_deletedBy_user_id_fk" FOREIGN KEY ("deletedBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "_board_board_labels" ADD CONSTRAINT "_board_board_labels_boardId_board_id_fk" FOREIGN KEY ("boardId") REFERENCES "public"."board"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "_board_board_labels" ADD CONSTRAINT "_board_board_labels_boardLabelId_board_label_id_fk" FOREIGN KEY ("boardLabelId") REFERENCES "public"."board_label"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "board_label_workspace_idx" ON "board_label" USING btree ("workspaceId");--> statement-breakpoint
CREATE INDEX "board_board_labels_label_idx" ON "_board_board_labels" USING btree ("boardLabelId");