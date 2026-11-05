import { TRPCError } from "@trpc/server";

import type { dbClient } from "@kan/db/client";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";

import { getNewMentionPublicIds } from "./mention-notifications";

export async function assertNoNewPausedMentions(
  db: dbClient,
  workspaceId: number,
  previousHtml: string | null,
  nextHtml: string,
) {
  const memberPublicIds = getNewMentionPublicIds(previousHtml, nextHtml);
  if (!memberPublicIds.length) return;

  const members = await workspaceRepo.getAllMembersByPublicIds(
    db,
    memberPublicIds,
    workspaceId,
  );

  if (members.length !== memberPublicIds.length)
    throw new TRPCError({
      message: "Mentioned member not found in this workspace",
      code: "NOT_FOUND",
    });

  if (members.some((member) => member.status === "paused"))
    throw new TRPCError({
      message: "Paused members cannot be mentioned",
      code: "BAD_REQUEST",
    });
}
