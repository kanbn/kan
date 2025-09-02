import { and, eq, inArray, isNull } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import { boards, workspaceMembers, workspaces } from "@kan/db/schema";
import { generateUID } from "@kan/shared/utils";

export const create = async (
  db: dbClient,
  workspaceInput: {
    publicId?: string;
    name: string;
    slug: string;
    createdBy: string;
    createdByEmail: string;
  },
) => {
  const [workspace] = await db
    .insert(workspaces)
    .values({
      publicId: workspaceInput.publicId ?? generateUID(),
      name: workspaceInput.name,
      slug: workspaceInput.slug,
      createdBy: workspaceInput.createdBy,
    })
    .returning({
      id: workspaces.id,
      publicId: workspaces.publicId,
      name: workspaces.name,
      slug: workspaces.slug,
      description: workspaces.description,
      plan: workspaces.plan,
    });

  if (workspace) {
    await db.insert(workspaceMembers).values({
      publicId: generateUID(),
      userId: workspaceInput.createdBy,
      email: workspaceInput.createdByEmail,
      workspaceId: workspace.id,
      createdBy: workspaceInput.createdBy,
      role: "admin",
      status: "active",
    });
  }

  const newWorkspace = { ...workspace };
  delete newWorkspace.id;

  return newWorkspace;
};

export const update = async (
  db: dbClient,
  workspacePublicId: string,
  workspaceInput: {
    name?: string;
    slug?: string;
    plan?: "free" | "pro" | "enterprise";
    description?: string;
  },
) => {
  const [result] = await db
    .update(workspaces)
    .set({
      name: workspaceInput.name,
      slug: workspaceInput.slug,
      plan: workspaceInput.plan,
      description: workspaceInput.description,
    })
    .where(eq(workspaces.publicId, workspacePublicId))
    .returning({
      id: workspaces.id,
      publicId: workspaces.publicId,
      name: workspaces.name,
      slug: workspaces.slug,
      description: workspaces.description,
      plan: workspaces.plan,
    });

  return result;
};

export const getByPublicId = (db: dbClient, workspacePublicId: string) => {
  return db.query.workspaces.findFirst({
    columns: {
      id: true,
      publicId: true,
      name: true,
      plan: true,
    },
    where: eq(workspaces.publicId, workspacePublicId),
  });
};

export const getByPublicIdWithMembers = (
  db: dbClient,
  workspacePublicId: string,
) => {
  return db.query.workspaces.findFirst({
    columns: {
      id: true,
      publicId: true,
    },
    with: {
      members: {
        columns: {
          publicId: true,
          email: true,
          role: true,
          status: true,
        },
        where: isNull(workspaceMembers.deletedAt),
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
      subscriptions: {
        columns: {
          id: true,
          plan: true,
          status: true,
          seats: true,
          periodStart: true,
          periodEnd: true,
        },
      },
    },
    where: and(
      eq(workspaces.publicId, workspacePublicId),
      isNull(workspaces.deletedAt),
    ),
  });
};

export const getBySlugWithBoards = (db: dbClient, workspaceSlug: string) => {
  return db.query.workspaces.findFirst({
    columns: {
      id: true,
      publicId: true,
      name: true,
      description: true,
      slug: true,
    },
    with: {
      boards: {
        columns: {
          publicId: true,
          slug: true,
          name: true,
        },
        where: and(isNull(boards.deletedAt), eq(boards.visibility, "public")),
      },
    },
    where: and(
      eq(workspaces.slug, workspaceSlug),
      isNull(workspaces.deletedAt),
    ),
  });
};

export const getAllByUserId = async (db: dbClient, userId: string) => {
  const result = await db.query.workspaceMembers.findMany({
    columns: {
      role: true,
    },
    with: {
      workspace: {
        columns: {
          publicId: true,
          name: true,
          description: true,
          slug: true,
          plan: true,
          deletedAt: true,
        },
        // https://github.com/drizzle-team/drizzle-orm/issues/2903
        // where: isNull(workspaces.deletedAt),
      },
    },
    where: and(
      eq(workspaceMembers.userId, userId),
      eq(workspaceMembers.status, "active"),
      isNull(workspaceMembers.deletedAt),
    ),
  });

  return result.filter((member) => !member.workspace.deletedAt);
};

export const getMemberByPublicId = (db: dbClient, memberPublicId: string) => {
  return db.query.workspaceMembers.findFirst({
    columns: {
      id: true,
    },
    where: eq(workspaceMembers.publicId, memberPublicId),
  });
};

export const getAllMembersByPublicIds = (
  db: dbClient,
  memberPublicIds: string[],
) => {
  return db.query.workspaceMembers.findMany({
    columns: {
      id: true,
    },
    where: inArray(workspaceMembers.publicId, memberPublicIds),
  });
};

export const hardDelete = (db: dbClient, workspacePublicId: string) => {
  return db
    .delete(workspaces)
    .where(eq(workspaces.publicId, workspacePublicId));
};

export const isWorkspaceSlugAvailable = async (
  db: dbClient,
  workspaceSlug: string,
) => {
  const result = await db.query.workspaces.findFirst({
    columns: {
      id: true,
    },
    where: and(
      eq(workspaces.slug, workspaceSlug),
      isNull(workspaces.deletedAt),
    ),
  });

  return result === undefined;
};

export const isUserInWorkspace = async (
  db: dbClient,
  userId: string,
  workspaceId: number,
  role?: "admin" | "member",
) => {
  const result = await db.query.workspaceMembers.findFirst({
    columns: {
      id: true,
    },
    where: and(
      eq(workspaceMembers.userId, userId),
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.status, "active"),
      isNull(workspaceMembers.deletedAt),
      role ? eq(workspaceMembers.role, role) : undefined,
    ),
  });

  return result?.id !== undefined;
};
