import { BadRequestException, NotFoundException } from "@nestjs/common";

import type { dbClient } from "@kan/db/client";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";

import { getNewMentionPublicIds } from "./mention-notifications";

// Only newly added mentions are checked, so existing mentions of a member who
// was paused later can still be edited around.
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

  if (members.length !== new Set(memberPublicIds).size)
    throw new NotFoundException("Mentioned member not found in this workspace");

  if (members.some((member) => member.status === "paused"))
    throw new BadRequestException("Paused members cannot be mentioned");
}
