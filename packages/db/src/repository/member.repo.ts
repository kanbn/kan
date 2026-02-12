import { and, count, eq, isNull } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import type { MemberRole, MemberStatus } from "@kan/db/schema";
import { workspaceMembers } from "@kan/db/schema";
import { generateUID } from "@kan/shared/utils";

export const getActiveCount = async (db: dbClient) => {
  const result = await db
    .select({ count: count() })
    .from(workspaceMembers)
    .where(
      and(
        isNull(workspaceMembers.deletedAt),
        eq(workspaceMembers.status, "active"),
      ),
    );

  return result[0]?.count ?? 0;
};

export const create = async (
  db: dbClient,
  memberInput: {
    userId: string | null;
    email: string;
    workspaceId: number;
    createdBy: string;
    role: MemberRole;
    roleId?: number | null;
    status: MemberStatus;
  },
) => {
  const [result] = await db
    .insert(workspaceMembers)
    .values({
      publicId: generateUID(),
      email: memberInput.email,
      userId: memberInput.userId,
      workspaceId: memberInput.workspaceId,
      createdBy: memberInput.createdBy,
      role: memberInput.role,
      roleId: memberInput.roleId ?? null,
      status: memberInput.status,
    })
    .returning({
      id: workspaceMembers.id,
      publicId: workspaceMembers.publicId,
    });

  return result;
};

export const getByPublicId = async (db: dbClient, publicId: string) => {
  return db.query.workspaceMembers.findFirst({
    where: eq(workspaceMembers.publicId, publicId),
  });
};

export const getById = async (db: dbClient, memberId: number) => {
  return db.query.workspaceMembers.findFirst({
    where: eq(workspaceMembers.id, memberId),
  });
};

export const getByPublicIdsWithUsers = async (
  db: dbClient,
  memberPublicIds: string[],
  workspaceId?: number,
) => {
  return db.query.workspaceMembers.findMany({
    where: (members, { inArray: inArrayFn, eq, and, isNull: isNullFn }) => {
      const conditions = [inArrayFn(members.publicId, memberPublicIds)];
      
      if (workspaceId) {
        conditions.push(eq(members.workspaceId, workspaceId));
      }
      
      conditions.push(eq(members.status, "active"));
      conditions.push(isNullFn(members.deletedAt));
      
      return and(...conditions);
    },
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
};

export const getByEmailAndStatus = async (
  db: dbClient,
  email: string,
  status: MemberStatus,
) => {
  return db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.email, email),
      eq(workspaceMembers.status, status),
      isNull(workspaceMembers.deletedAt),
    ),
  });
};

export const acceptInvite = async (
  db: dbClient,
  args: { memberId: number; userId: string },
) => {
  const [result] = await db
    .update(workspaceMembers)
    .set({ status: "active", userId: args.userId })
    .where(eq(workspaceMembers.id, args.memberId))
    .returning({
      id: workspaceMembers.id,
      publicId: workspaceMembers.publicId,
    });

  return result;
};

export const softDelete = async (
  db: dbClient,
  args: {
    memberId: number;
    deletedAt: Date;
    deletedBy: string;
  },
) => {
  const [result] = await db
    .update(workspaceMembers)
    .set({ deletedAt: args.deletedAt, deletedBy: args.deletedBy })
    .where(
      and(
        eq(workspaceMembers.id, args.memberId),
        isNull(workspaceMembers.deletedAt),
      ),
    )
    .returning({
      id: workspaceMembers.id,
      publicId: workspaceMembers.publicId,
    });

  return result;
};

export const unpauseAllMembers = async (db: dbClient, workspaceId: number) => {
  await db
    .update(workspaceMembers)
    .set({ status: "active" })
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.status, "paused"),
      ),
    );
};

export const pauseAllMembers = async (db: dbClient, workspaceId: number) => {
  await db
    .update(workspaceMembers)
    .set({ status: "paused" })
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.status, "active"),
      ),
    );
};

export const updateRole = async (
  db: dbClient,
  args: {
    memberId: number;
    role: MemberRole;
    roleId: number | null;
  },
) => {
  const [result] = await db
    .update(workspaceMembers)
    .set({
      role: args.role,
      roleId: args.roleId,
      updatedAt: new Date(),
    })
    .where(eq(workspaceMembers.id, args.memberId))
    .returning({
      id: workspaceMembers.id,
      publicId: workspaceMembers.publicId,
      role: workspaceMembers.role,
    });

  return result;
};
