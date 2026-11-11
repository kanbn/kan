import { ForbiddenException } from "@nestjs/common";

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
    throw new ForbiddenException(`You do not have access to this workspace`);
}
