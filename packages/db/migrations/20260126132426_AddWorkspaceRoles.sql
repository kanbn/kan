CREATE TABLE IF NOT EXISTS "workspace_member_permissions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"workspaceMemberId" bigint NOT NULL,
	"permission" varchar(64) NOT NULL,
	"granted" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp
);
--> statement-breakpoint
ALTER TABLE "workspace_member_permissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspace_role_permissions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"workspaceRoleId" bigint NOT NULL,
	"permission" varchar(64) NOT NULL,
	"granted" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace_role_permissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspace_roles" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"workspaceId" bigint NOT NULL,
	"name" varchar(64) NOT NULL,
	"description" varchar(255),
	"hierarchyLevel" integer NOT NULL,
	"isSystem" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp
);
--> statement-breakpoint
ALTER TABLE "workspace_roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD COLUMN "roleId" bigint;--> statement-breakpoint
ALTER TABLE "workspace" ADD COLUMN "showEmailsToMembers" boolean DEFAULT true NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace_role_permissions" ADD CONSTRAINT "workspace_role_permissions_workspaceRoleId_workspace_roles_id_fk" FOREIGN KEY ("workspaceRoleId") REFERENCES "public"."workspace_roles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace_roles" ADD CONSTRAINT "workspace_roles_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_member_permission" ON "workspace_member_permissions" USING btree ("workspaceMemberId","permission");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "permission_member_idx" ON "workspace_member_permissions" USING btree ("workspaceMemberId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_role_permission" ON "workspace_role_permissions" USING btree ("workspaceRoleId","permission");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "role_permissions_role_idx" ON "workspace_role_permissions" USING btree ("workspaceRoleId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_role_per_workspace" ON "workspace_roles" USING btree ("workspaceId","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workspace_roles_workspace_idx" ON "workspace_roles" USING btree ("workspaceId");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_roleId_workspace_roles_id_fk" FOREIGN KEY ("roleId") REFERENCES "public"."workspace_roles"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- Seed system roles for each existing workspace
INSERT INTO "workspace_roles" ("workspaceId", "name", "description", "hierarchyLevel", "isSystem", "createdAt")
SELECT w.id, 'admin', 'Full access to all workspace features', 100, true, NOW()
FROM "workspace" w
WHERE NOT EXISTS (
  SELECT 1 FROM "workspace_roles" wr 
  WHERE wr."workspaceId" = w.id AND wr."name" = 'admin'
);
--> statement-breakpoint
INSERT INTO "workspace_roles" ("workspaceId", "name", "description", "hierarchyLevel", "isSystem", "createdAt")
SELECT w.id, 'member', 'Standard member with create and edit permissions', 50, true, NOW()
FROM "workspace" w
WHERE NOT EXISTS (
  SELECT 1 FROM "workspace_roles" wr 
  WHERE wr."workspaceId" = w.id AND wr."name" = 'member'
);
--> statement-breakpoint
INSERT INTO "workspace_roles" ("workspaceId", "name", "description", "hierarchyLevel", "isSystem", "createdAt")
SELECT w.id, 'guest', 'View-only access', 10, true, NOW()
FROM "workspace" w
WHERE NOT EXISTS (
  SELECT 1 FROM "workspace_roles" wr 
  WHERE wr."workspaceId" = w.id AND wr."name" = 'guest'
);
--> statement-breakpoint

-- Seed admin role permissions (all permissions)
INSERT INTO "workspace_role_permissions" ("workspaceRoleId", "permission", "granted", "createdAt")
SELECT wr.id, p.permission, true, NOW()
FROM "workspace_roles" wr
CROSS JOIN (
  VALUES 
    ('workspace:view'), ('workspace:edit'), ('workspace:delete'), ('workspace:manage'),
    ('board:view'), ('board:create'), ('board:edit'), ('board:delete'),
    ('list:view'), ('list:create'), ('list:edit'), ('list:delete'),
    ('card:view'), ('card:create'), ('card:edit'), ('card:delete'),
    ('comment:view'), ('comment:create'), ('comment:edit'), ('comment:delete'),
    ('member:view'), ('member:invite'), ('member:edit'), ('member:remove')
) AS p(permission)
WHERE wr."name" = 'admin' AND wr."isSystem" = true
AND NOT EXISTS (
  SELECT 1 FROM "workspace_role_permissions" wrp 
  WHERE wrp."workspaceRoleId" = wr.id AND wrp."permission" = p.permission
);
--> statement-breakpoint

-- Seed member role permissions
INSERT INTO "workspace_role_permissions" ("workspaceRoleId", "permission", "granted", "createdAt")
SELECT wr.id, p.permission, true, NOW()
FROM "workspace_roles" wr
CROSS JOIN (
  VALUES 
    ('workspace:view'),
    ('board:view'), ('board:create'),
    ('list:view'), ('list:create'), ('list:edit'),
    ('card:view'), ('card:create'), ('card:edit'), ('card:delete'),
    ('comment:view'), ('comment:create'), ('comment:edit'), ('comment:delete'),
    ('member:view')
) AS p(permission)
WHERE wr."name" = 'member' AND wr."isSystem" = true
AND NOT EXISTS (
  SELECT 1 FROM "workspace_role_permissions" wrp 
  WHERE wrp."workspaceRoleId" = wr.id AND wrp."permission" = p.permission
);
--> statement-breakpoint

-- Seed guest role permissions (view only)
INSERT INTO "workspace_role_permissions" ("workspaceRoleId", "permission", "granted", "createdAt")
SELECT wr.id, p.permission, true, NOW()
FROM "workspace_roles" wr
CROSS JOIN (
  VALUES 
    ('workspace:view'),
    ('board:view'),
    ('list:view'),
    ('card:view'),
    ('comment:view'),
    ('member:view')
) AS p(permission)
WHERE wr."name" = 'guest' AND wr."isSystem" = true
AND NOT EXISTS (
  SELECT 1 FROM "workspace_role_permissions" wrp 
  WHERE wrp."workspaceRoleId" = wr.id AND wrp."permission" = p.permission
);
--> statement-breakpoint

-- Migrate existing workspace_members to use roleId
UPDATE "workspace_members" wm
SET "roleId" = wr.id
FROM "workspace_roles" wr
WHERE wm."workspaceId" = wr."workspaceId"
  AND wm."role"::text = wr."name"
  AND wm."roleId" IS NULL;
