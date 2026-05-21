import type { dbClient } from "@kan/db/client";
import * as memberRepo from "@kan/db/repository/member.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { generateUID } from "@kan/shared/utils";

export const cancelWorkspaceAccess = async (
  db: dbClient,
  workspacePublicId: string,
): Promise<void> => {
  const workspace = await workspaceRepo.getByPublicId(db, workspacePublicId);

  if (!workspace) return;

  const preserveUserId = await memberRepo.getPreservableMemberId(
    db,
    workspace.id,
    workspace.createdBy ?? null,
  );

  let newSlug = workspace.publicId;
  if (workspace.slug !== workspace.publicId) {
    const isPublicIdAvailable = await workspaceRepo.isWorkspaceSlugAvailable(
      db,
      workspace.publicId,
    );
    if (!isPublicIdAvailable) {
      newSlug = generateUID();
    }
  }

  await Promise.all([
    preserveUserId
      ? memberRepo.pauseMembersExcept(db, workspace.id, preserveUserId)
      : memberRepo.pauseAllMembers(db, workspace.id),
    workspaceRepo.update(db, workspacePublicId, {
      plan: "free",
      slug: newSlug,
    }),
  ]);
};
