import { TRPCError } from "@trpc/server";

import type { dbClient } from "@kan/db/client";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";

export async function assertUserInWorkspace(
  db: dbClient,
  userId: string,
  workspaceId: number,
  role?: "admin" | "member",
) {
  const isMember = await workspaceRepo.isUserInWorkspace(
    db,
    userId,
    workspaceId,
    role,
  );

  if (!isMember)
    throw new TRPCError({
      message: `You do not have access to this workspace`,
      code: "FORBIDDEN",
    });
}

export async function assertUserAdminInWorkspace(
  db: dbClient,
  userId: string,
  workspaceId: number,
) {
  const role = await workspaceRepo.getUserRoleInWorkspace(
    db,
    userId,
    workspaceId,
  );

  if (role != "admin")
    throw new TRPCError({
      message: `You do not have Admin access to this workspace`,
      code: "FORBIDDEN",
    });
}
