import { and, eq, gt } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import { workspaceInviteLinks } from "@kan/db/schema";
import { generateUID } from "@kan/shared/utils";

export const createInviteLink = async (
  db: dbClient,
  args: {
    workspaceId: number;
    code: string;
    expiresAt: Date | null;
    createdBy: string;
  },
) => {
  const [result] = await db
    .insert(workspaceInviteLinks)
    .values({
      publicId: generateUID(),
      workspaceId: args.workspaceId,
      code: args.code,
      expiresAt: args.expiresAt ?? null,
      status: "active",
      createdBy: args.createdBy,
    })
    .returning({
      publicId: workspaceInviteLinks.publicId,
      code: workspaceInviteLinks.code,
      status: workspaceInviteLinks.status,
      expiresAt: workspaceInviteLinks.expiresAt,
    });
  return result;
};

export const deactivateAllActiveForWorkspace = async (
  db: dbClient,
  args: { workspaceId: number; updatedBy: string },
) => {
  await db
    .update(workspaceInviteLinks)
    .set({
      status: "inactive",
      updatedBy: args.updatedBy,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(workspaceInviteLinks.workspaceId, args.workspaceId),
        eq(workspaceInviteLinks.status, "active"),
      ),
    );
};

export const getActiveForWorkspace = async (
  db: dbClient,
  workspaceId: number,
) => {
  return db.query.workspaceInviteLinks.findFirst({
    where: and(
      eq(workspaceInviteLinks.workspaceId, workspaceId),
      eq(workspaceInviteLinks.status, "active"),
    ),
    orderBy: (links, { desc }) => [desc(links.createdAt)],
  });
};

export const getByCode = async (db: dbClient, code: string) => {
  return db.query.workspaceInviteLinks.findFirst({
    where: eq(workspaceInviteLinks.code, code),
  });
};
