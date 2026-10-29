import { and, asc, count, eq, isNull, ne } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import type { BoardMemberRole } from "@kan/db/schema";
import { boardMembers, workspaceMembers } from "@kan/db/schema";

// Accepts either the db client or a transaction
type DbOrTx = Pick<dbClient, "select" | "insert" | "update" | "delete">;

export class CannotRemoveLastBoardAdminError extends Error {
  constructor() {
    super("Cannot remove the only admin of this board");
    this.name = "CannotRemoveLastBoardAdminError";
  }
}

export const add = async (
  db: dbClient,
  args: {
    boardId: number;
    workspaceMemberId: number;
    role: BoardMemberRole;
    createdBy: string;
  },
) => {
  const [result] = await db
    .insert(boardMembers)
    .values(args)
    .onConflictDoNothing()
    .returning();

  return result;
};

export const addCreatorAsAdmin = async (
  db: DbOrTx,
  args: { boardId: number; workspaceId: number; userId: string },
) => {
  const [member] = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, args.workspaceId),
        eq(workspaceMembers.userId, args.userId),
        isNull(workspaceMembers.deletedAt),
      ),
    )
    .limit(1);

  if (!member) return;

  await db
    .insert(boardMembers)
    .values({
      boardId: args.boardId,
      workspaceMemberId: member.id,
      role: "admin",
      createdBy: args.userId,
    })
    .onConflictDoNothing();
};

// Locks every admin row of a board for the duration of the caller's
// transaction, so concurrent demotions/removals serialize instead of both
// reading a stale admin count and leaving the board with zero admins.
const lockAdminRows = async (tx: DbOrTx, boardId: number) => {
  return tx
    .select({ workspaceMemberId: boardMembers.workspaceMemberId })
    .from(boardMembers)
    .where(and(eq(boardMembers.boardId, boardId), eq(boardMembers.role, "admin")))
    .for("update");
};

export const updateRole = async (
  db: dbClient,
  args: { boardId: number; workspaceMemberId: number; role: BoardMemberRole },
) => {
  return db.transaction(async (tx) => {
    const adminRows = await lockAdminRows(tx, args.boardId);
    const isCurrentlyAdmin = adminRows.some(
      (row) => row.workspaceMemberId === args.workspaceMemberId,
    );

    if (isCurrentlyAdmin && args.role === "member" && adminRows.length <= 1) {
      throw new CannotRemoveLastBoardAdminError();
    }

    const [result] = await tx
      .update(boardMembers)
      .set({ role: args.role })
      .where(
        and(
          eq(boardMembers.boardId, args.boardId),
          eq(boardMembers.workspaceMemberId, args.workspaceMemberId),
        ),
      )
      .returning();

    return result;
  });
};

export const remove = async (
  db: dbClient,
  args: { boardId: number; workspaceMemberId: number },
) => {
  return db.transaction(async (tx) => {
    const adminRows = await lockAdminRows(tx, args.boardId);
    const isCurrentlyAdmin = adminRows.some(
      (row) => row.workspaceMemberId === args.workspaceMemberId,
    );

    if (isCurrentlyAdmin && adminRows.length <= 1) {
      throw new CannotRemoveLastBoardAdminError();
    }

    const [result] = await tx
      .delete(boardMembers)
      .where(
        and(
          eq(boardMembers.boardId, args.boardId),
          eq(boardMembers.workspaceMemberId, args.workspaceMemberId),
        ),
      )
      .returning();

    return result;
  });
};

// Removes every board membership for a workspace member (e.g. when they
// leave the workspace entirely). Unlike remove(), this can't simply refuse
// when they're a board's sole admin - leaving the workspace isn't optional -
// so instead it promotes another existing board member to admin first,
// where one exists, rather than leaving the board with zero admins.
export const removeAllForMember = async (
  db: DbOrTx,
  workspaceMemberId: number,
) => {
  const adminBoards = await db
    .select({ boardId: boardMembers.boardId })
    .from(boardMembers)
    .where(
      and(
        eq(boardMembers.workspaceMemberId, workspaceMemberId),
        eq(boardMembers.role, "admin"),
      ),
    );

  for (const { boardId } of adminBoards) {
    const adminRows = await lockAdminRows(db, boardId);
    const isSoleAdmin =
      adminRows.length === 1 &&
      adminRows[0]?.workspaceMemberId === workspaceMemberId;

    if (!isSoleAdmin) continue;

    const [replacement] = await db
      .select({ workspaceMemberId: boardMembers.workspaceMemberId })
      .from(boardMembers)
      .where(
        and(
          eq(boardMembers.boardId, boardId),
          ne(boardMembers.workspaceMemberId, workspaceMemberId),
        ),
      )
      .orderBy(asc(boardMembers.createdAt))
      .limit(1);

    if (replacement) {
      await db
        .update(boardMembers)
        .set({ role: "admin" })
        .where(
          and(
            eq(boardMembers.boardId, boardId),
            eq(boardMembers.workspaceMemberId, replacement.workspaceMemberId),
          ),
        );
    }
  }

  return db
    .delete(boardMembers)
    .where(eq(boardMembers.workspaceMemberId, workspaceMemberId));
};

export const getByBoardId = async (db: dbClient, boardId: number) => {
  return db.query.boardMembers.findMany({
    columns: {
      role: true,
      createdAt: true,
    },
    with: {
      member: {
        columns: {
          publicId: true,
          email: true,
          role: true,
          status: true,
        },
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
    },
    where: eq(boardMembers.boardId, boardId),
  });
};

export const getMembership = async (
  db: dbClient,
  args: { boardId: number; userId: string },
) => {
  const [result] = await db
    .select({
      role: boardMembers.role,
      workspaceMemberId: boardMembers.workspaceMemberId,
    })
    .from(boardMembers)
    .innerJoin(
      workspaceMembers,
      eq(workspaceMembers.id, boardMembers.workspaceMemberId),
    )
    .where(
      and(
        eq(boardMembers.boardId, args.boardId),
        eq(workspaceMembers.userId, args.userId),
        isNull(workspaceMembers.deletedAt),
      ),
    )
    .limit(1);

  return result;
};

export const getMemberBoardIds = async (
  db: dbClient,
  args: { workspaceId: number; userId: string },
) => {
  const result = await db
    .select({ boardId: boardMembers.boardId })
    .from(boardMembers)
    .innerJoin(
      workspaceMembers,
      eq(workspaceMembers.id, boardMembers.workspaceMemberId),
    )
    .where(
      and(
        eq(workspaceMembers.workspaceId, args.workspaceId),
        eq(workspaceMembers.userId, args.userId),
        isNull(workspaceMembers.deletedAt),
      ),
    );

  return result.map((row) => row.boardId);
};

export const countAdmins = async (db: dbClient, boardId: number) => {
  const [result] = await db
    .select({ count: count() })
    .from(boardMembers)
    .where(
      and(eq(boardMembers.boardId, boardId), eq(boardMembers.role, "admin")),
    );

  return result?.count ?? 0;
};
