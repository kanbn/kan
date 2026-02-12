import { and, count, desc, eq, gt, isNull, sql } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import { lists } from "@kan/db/schema";
import { generateUID } from "@kan/shared/utils";

export const getCount = async (db: dbClient) => {
  const result = await db
    .select({ count: count() })
    .from(lists)
    .where(isNull(lists.deletedAt));

  return result[0]?.count ?? 0;
};

export const create = async (
  db: dbClient,
  listInput: {
    name: string;
    createdBy: string;
    boardId: number;
    importId?: number;
  },
) => {
  return db.transaction(async (tx) => {
    const list = await tx.query.lists.findFirst({
      columns: {
        id: true,
        boardId: true,
        index: true,
      },
      where: and(eq(lists.boardId, listInput.boardId), isNull(lists.deletedAt)),
      orderBy: [desc(lists.index)],
    });

    const index = list ? list.index + 1 : 0;

    const [result] = await tx
      .insert(lists)
      .values({
        publicId: generateUID(),
        name: listInput.name,
        createdBy: listInput.createdBy,
        boardId: listInput.boardId,
        index,
        importId: listInput.importId,
      })
      .returning({
        id: lists.id,
        publicId: lists.publicId,
        boardId: lists.boardId,
        name: lists.name,
      });

    if (!result)
      throw new Error(`Failed to create list for board ${listInput.boardId}`);

    const countExpr = sql<number>`COUNT(*)`.mapWith(Number);

    const duplicateIndices = await tx
      .select({
        index: lists.index,
        count: countExpr,
      })
      .from(lists)
      .where(and(eq(lists.boardId, result.boardId), isNull(lists.deletedAt)))
      .groupBy(lists.index)
      .having(gt(countExpr, 1));

    if (duplicateIndices.length > 0) {
      // Compact indices to sequential values (0..n-1) to resolve duplicates while preserving order
      await tx.execute(sql`
        WITH ordered AS (
          SELECT id, ROW_NUMBER() OVER (ORDER BY "index", id) - 1 AS new_index
          FROM "list"
          WHERE "boardId" = ${result.boardId} AND "deletedAt" IS NULL
        )
        UPDATE "list" l
        SET "index" = o.new_index
        FROM ordered o
        WHERE l.id = o.id;
      `);

      // Last resort: verify fix; if duplicates persist (e.g., due to race conditions), rollback
      const postFixDupes = await tx
        .select({ index: lists.index, count: countExpr })
        .from(lists)
        .where(and(eq(lists.boardId, result.boardId), isNull(lists.deletedAt)))
        .groupBy(lists.index)
        .having(gt(countExpr, 1));

      if (postFixDupes.length > 0) {
        throw new Error(
          `Invariant violation: duplicate indices remain after compaction in board ${result.boardId}`,
        );
      }
    }

    return result;
  });
};

export const bulkCreate = async (
  db: dbClient,
  listInput: {
    publicId: string;
    name: string;
    createdBy: string;
    boardId: number;
    index: number;
    importId?: number;
  }[],
) => {
  if (listInput.length === 0) return [];

  return db.transaction(async (tx) => {
    // Group incoming rows by board to compute safe, sequential indices per board
    const byBoard = new Map<number, typeof listInput>();
    for (const item of listInput) {
      const arr = byBoard.get(item.boardId) ?? [];
      arr.push(item);
      byBoard.set(item.boardId, arr);
    }

    const allValuesToInsert: {
      publicId: string;
      name: string;
      createdBy: string;
      boardId: number;
      index: number;
      importId?: number;
    }[] = [];

    // For each board, append incoming lists after the current max index, preserving their relative order
    for (const [boardId, items] of byBoard.entries()) {
      // Find current max index for non-deleted lists in this board
      const last = await tx.query.lists.findFirst({
        columns: { index: true },
        where: and(eq(lists.boardId, boardId), isNull(lists.deletedAt)),
        orderBy: [desc(lists.index)],
      });

      let nextIndex = last ? last.index + 1 : 0;

      // Sort incoming by their provided index to preserve Trello order, then reassign sequential indices
      const sorted = [...items].sort((a, b) => a.index - b.index);
      for (const it of sorted) {
        allValuesToInsert.push({
          publicId: it.publicId,
          name: it.name,
          createdBy: it.createdBy,
          boardId: it.boardId,
          index: nextIndex++,
          importId: it.importId,
        });
      }
    }

    // Insert all rows in one go
    const inserted = await tx
      .insert(lists)
      .values(allValuesToInsert)
      .returning();

    // Post-insert check: if duplicates exist, compact indices per board instead of failing
    const countExpr = sql<number>`COUNT(*)`.mapWith(Number);
    for (const boardId of byBoard.keys()) {
      const duplicateIndices = await tx
        .select({ index: lists.index, count: countExpr })
        .from(lists)
        .where(and(eq(lists.boardId, boardId), isNull(lists.deletedAt)))
        .groupBy(lists.index)
        .having(gt(countExpr, 1));

      if (duplicateIndices.length > 0) {
        await tx.execute(sql`
          WITH ordered AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY "index", id) - 1 AS new_index
            FROM "list"
            WHERE "boardId" = ${boardId} AND "deletedAt" IS NULL
          )
          UPDATE "list" l
          SET "index" = o.new_index
          FROM ordered o
          WHERE l.id = o.id;
        `);

        // Last resort: verify fix; if duplicates persist (e.g., due to race conditions), rollback
        const postFixDupes = await tx
          .select({ index: lists.index, count: countExpr })
          .from(lists)
          .where(and(eq(lists.boardId, boardId), isNull(lists.deletedAt)))
          .groupBy(lists.index)
          .having(gt(countExpr, 1));

        if (postFixDupes.length > 0) {
          throw new Error(
            `Invariant violation: duplicate indices remain after compaction in board ${boardId}`,
          );
        }
      }
    }

    return inserted;
  });
};

export const getByPublicId = async (db: dbClient, listPublicId: string) => {
  return db.query.lists.findFirst({
    columns: {
      id: true,
      boardId: true,
      index: true,
    },
    where: eq(lists.publicId, listPublicId),
  });
};

export const getWithCardsByPublicId = async (
  db: dbClient,
  listPublicId: string,
) => {
  return db.query.lists.findFirst({
    columns: {
      id: true,
    },
    with: {
      cards: {
        columns: {
          index: true,
        },
        where: isNull(lists.deletedAt),
        orderBy: [desc(lists.index)],
      },
    },
    where: and(eq(lists.publicId, listPublicId), isNull(lists.deletedAt)),
  });
};

export const update = async (
  db: dbClient,
  listInput: {
    name: string;
  },
  args: {
    listPublicId: string;
  },
) => {
  const [result] = await db
    .update(lists)
    .set({ name: listInput.name })
    .where(and(eq(lists.publicId, args.listPublicId), isNull(lists.deletedAt)))
    .returning({
      publicId: lists.publicId,
      name: lists.name,
    });

  return result;
};

export const reorder = async (
  db: dbClient,
  args: {
    listPublicId: string;
    newIndex: number;
  },
) => {
  return db.transaction(async (tx) => {
    const list = await tx.query.lists.findFirst({
      columns: {
        id: true,
        boardId: true,
        index: true,
      },
      where: eq(lists.publicId, args.listPublicId),
    });

    if (!list)
      throw new Error(`List not found for public ID ${args.listPublicId}`);

    await tx.execute(sql`
      UPDATE list
      SET index =
        CASE
          WHEN index = ${list.index} AND id = ${list.id} THEN ${args.newIndex}
          WHEN ${list.index} < ${args.newIndex} AND index > ${list.index} AND index <= ${args.newIndex} THEN index - 1
          WHEN ${list.index} > ${args.newIndex} AND index >= ${args.newIndex} AND index < ${list.index} THEN index + 1
          ELSE index
        END
      WHERE "boardId" = ${list.boardId};
    `);

    const countExpr = sql<number>`COUNT(*)`.mapWith(Number);

    const duplicateIndices = await tx
      .select({
        index: lists.index,
        count: countExpr,
      })
      .from(lists)
      .where(and(eq(lists.boardId, list.boardId), isNull(lists.deletedAt)))
      .groupBy(lists.index)
      .having(gt(countExpr, 1));

    if (duplicateIndices.length > 0) {
      // Attempt to auto-heal by compacting indices to sequential values (0..n-1) while preserving order
      await tx.execute(sql`
        WITH ordered AS (
          SELECT id, ROW_NUMBER() OVER (ORDER BY "index", id) - 1 AS new_index
          FROM "list"
          WHERE "boardId" = ${list.boardId} AND "deletedAt" IS NULL
        )
        UPDATE "list" l
        SET "index" = o.new_index
        FROM ordered o
        WHERE l.id = o.id;
      `);

      // Last resort verification: if duplicates persist, rollback
      const postFixDupes = await tx
        .select({ index: lists.index, count: countExpr })
        .from(lists)
        .where(and(eq(lists.boardId, list.boardId), isNull(lists.deletedAt)))
        .groupBy(lists.index)
        .having(gt(countExpr, 1));

      if (postFixDupes.length > 0) {
        throw new Error(
          `Invariant violation: duplicate indices remain after compaction in board ${list.boardId}`,
        );
      }
    }

    const updatedList = await tx.query.lists.findFirst({
      columns: {
        publicId: true,
        name: true,
      },
      where: eq(lists.publicId, args.listPublicId),
    });

    return updatedList;
  });
};

export const softDeleteAllByBoardId = async (
  db: dbClient,
  args: {
    boardId: number;
    deletedAt: Date;
    deletedBy: string;
  },
) => {
  const result = await db
    .update(lists)
    .set({ deletedAt: args.deletedAt, deletedBy: args.deletedBy })
    .where(and(eq(lists.boardId, args.boardId), isNull(lists.deletedAt)))
    .returning({
      id: lists.id,
    });

  return result;
};

export const softDeleteById = async (
  db: dbClient,
  args: {
    listId: number;
    deletedAt: Date;
    deletedBy: string;
  },
) => {
  return db.transaction(async (tx) => {
    const [result] = await tx
      .update(lists)
      .set({ deletedAt: args.deletedAt, deletedBy: args.deletedBy })
      .where(and(eq(lists.id, args.listId), isNull(lists.deletedAt)))
      .returning({
        id: lists.id,
        index: lists.index,
        boardId: lists.boardId,
      });

    if (!result)
      throw new Error(`Unable to soft delete list ID ${args.listId}`);

    await tx.execute(sql`
      UPDATE list
      SET index = index - 1
      WHERE "boardId" = ${result.boardId} AND index > ${result.index} AND "deletedAt" IS NULL;
    `);

    const countExpr = sql<number>`COUNT(*)`.mapWith(Number);

    const duplicateIndices = await tx
      .select({
        index: lists.index,
        count: countExpr,
      })
      .from(lists)
      .where(and(eq(lists.boardId, result.boardId), isNull(lists.deletedAt)))
      .groupBy(lists.index)
      .having(gt(countExpr, 1));

    console.log(duplicateIndices);

    if (duplicateIndices.length > 0) {
      throw new Error(
        `Duplicate indices found after reordering in board ${result.boardId}`,
      );
    }

    return result;
  });
};

export const getWorkspaceAndListIdByListPublicId = async (
  db: dbClient,
  listPublicId: string,
) => {
  const result = await db.query.lists.findFirst({
    columns: { id: true, createdBy: true },
    where: and(eq(lists.publicId, listPublicId), isNull(lists.deletedAt)),
    with: {
      board: {
        columns: {
          workspaceId: true,
        },
      },
    },
  });

  return result
    ? {
        id: result.id,
        createdBy: result.createdBy,
        workspaceId: result.board.workspaceId,
      }
    : null;
};
