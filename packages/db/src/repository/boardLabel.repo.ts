import { and, asc, eq, inArray, isNull } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import { boardLabels, boardsToBoardLabels } from "@kan/db/schema";
import { generateUID } from "@kan/shared/utils";

const publicColumns = {
  publicId: boardLabels.publicId,
  name: boardLabels.name,
  colourCode: boardLabels.colourCode,
};

export const getAllByWorkspaceId = (db: dbClient, workspaceId: number) =>
  db
    .select(publicColumns)
    .from(boardLabels)
    .where(
      and(
        eq(boardLabels.workspaceId, workspaceId),
        isNull(boardLabels.deletedAt),
      ),
    )
    .orderBy(asc(boardLabels.name));

export const getByPublicId = (db: dbClient, boardLabelPublicId: string) =>
  db.query.boardLabels.findFirst({
    columns: { id: true, workspaceId: true },
    where: and(
      eq(boardLabels.publicId, boardLabelPublicId),
      isNull(boardLabels.deletedAt),
    ),
  });

export const create = async (
  db: dbClient,
  input: {
    name: string;
    colourCode: string;
    workspaceId: number;
    createdBy: string;
  },
) => {
  const [result] = await db
    .insert(boardLabels)
    .values({ publicId: generateUID(), ...input })
    .returning(publicColumns);
  return result;
};

export const update = async (
  db: dbClient,
  id: number,
  input: { name: string; colourCode: string },
) => {
  const [result] = await db
    .update(boardLabels)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(boardLabels.id, id))
    .returning(publicColumns);
  return result;
};

// Links are removed outright, so board queries never need to skip deleted labels.
export const softDelete = (db: dbClient, id: number, deletedBy: string) =>
  db.transaction(async (tx) => {
    await tx
      .delete(boardsToBoardLabels)
      .where(eq(boardsToBoardLabels.boardLabelId, id));
    await tx
      .update(boardLabels)
      .set({ deletedAt: new Date(), deletedBy })
      .where(eq(boardLabels.id, id));
  });

export const setForBoard = (
  db: dbClient,
  args: { boardId: number; workspaceId: number; publicIds: string[] },
) =>
  db.transaction(async (tx) => {
    const found = args.publicIds.length
      ? await tx
          .select({ id: boardLabels.id })
          .from(boardLabels)
          .where(
            and(
              inArray(boardLabels.publicId, args.publicIds),
              eq(boardLabels.workspaceId, args.workspaceId),
              isNull(boardLabels.deletedAt),
            ),
          )
      : [];

    if (found.length !== new Set(args.publicIds).size) return false;

    await tx
      .delete(boardsToBoardLabels)
      .where(eq(boardsToBoardLabels.boardId, args.boardId));
    if (found.length)
      await tx
        .insert(boardsToBoardLabels)
        .values(
          found.map(({ id }) => ({ boardId: args.boardId, boardLabelId: id })),
        );
    return true;
  });
