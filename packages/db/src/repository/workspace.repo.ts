import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  asc,
  or,
  sql,
} from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import {
  boards,
  cards,
  lists,
  workspaceMembers,
  workspaces,
} from "@kan/db/schema";
import type { Permission, Role } from "@kan/shared";
import { generateUID, getDefaultPermissions } from "@kan/shared";

import * as permissionRepo from "./permission.repo";

// System role definitions
const SYSTEM_ROLES: {
  name: Role;
  description: string;
  hierarchyLevel: number;
}[] = [
  {
    name: "admin",
    description: "Full access to all workspace features",
    hierarchyLevel: 100,
  },
  {
    name: "member",
    description: "Standard member with create and edit permissions",
    hierarchyLevel: 50,
  },
  {
    name: "guest",
    description: "View-only access",
    hierarchyLevel: 10,
  },
];

export const getCount = async (db: dbClient) => {
  const result = await db
    .select({ count: count() })
    .from(workspaces)
    .where(isNull(workspaces.deletedAt));

  return result[0]?.count ?? 0;
};

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
    // Create system roles for the workspace
    let adminRoleId: number | null = null;
    for (const roleData of SYSTEM_ROLES) {
      const role = await permissionRepo.createRole(db, {
        workspaceId: workspace.id,
        name: roleData.name,
        description: roleData.description,
        hierarchyLevel: roleData.hierarchyLevel,
        isSystem: true,
        permissions: [...getDefaultPermissions(roleData.name)] as Permission[],
      });
      if (roleData.name === "admin" && role) {
        adminRoleId = role.id;
      }
    }

    await db.insert(workspaceMembers).values({
      publicId: generateUID(),
      userId: workspaceInput.createdBy,
      email: workspaceInput.createdByEmail,
      workspaceId: workspace.id,
      createdBy: workspaceInput.createdBy,
      role: "admin",
      roleId: adminRoleId,
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
    showEmailsToMembers?: boolean;
  },
) => {
  const [result] = await db
    .update(workspaces)
    .set({
      name: workspaceInput.name,
      slug: workspaceInput.slug,
      plan: workspaceInput.plan,
      description: workspaceInput.description,
      showEmailsToMembers: workspaceInput.showEmailsToMembers,
    })
    .where(eq(workspaces.publicId, workspacePublicId))
    .returning({
      id: workspaces.id,
      publicId: workspaces.publicId,
      name: workspaces.name,
      slug: workspaces.slug,
      description: workspaces.description,
      plan: workspaces.plan,
      showEmailsToMembers: workspaces.showEmailsToMembers,
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
      slug: true,
    },
    where: eq(workspaces.publicId, workspacePublicId),
  });
};

export const getById = (db: dbClient, workspaceId: number) => {
  return db.query.workspaces.findFirst({
    columns: {
      id: true,
      publicId: true,
      name: true,
      plan: true,
      slug: true,
    },
    where: eq(workspaces.id, workspaceId),
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
      name: true,
      slug: true,
      showEmailsToMembers: true,
    },
    with: {
      members: {
        columns: {
          publicId: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
        },
        where: isNull(workspaceMembers.deletedAt),
        orderBy: (member, { desc }) => [
          desc(sql`CASE WHEN ${member.role} = 'admin' THEN 1 ELSE 0 END`),
          desc(member.createdAt),
        ],
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
          unlimitedSeats: true,
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
        orderBy: [asc(boards.name)]
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

export const searchBoardsAndCards = async (
  db: dbClient,
  workspaceId: number,
  query: string,
  limit = 20,
) => {
  const searchQuery = `%${query}%`;

  // Search for boards
  const boardResults = await db
    .select({
      publicId: boards.publicId,
      title: boards.name,
      description: boards.description,
      slug: boards.slug,
      updatedAt: boards.updatedAt,
      createdAt: boards.createdAt,
    })
    .from(boards)
    .where(
      and(
        eq(boards.workspaceId, workspaceId),
        // Combine exact and fuzzy matching
        or(
          ilike(boards.name, `%${query}%`), // Exact substring match
          sql`similarity(${boards.name}, ${query}) > 0.2`, // Fuzzy match
        ),
        isNull(boards.deletedAt),
      ),
    )
    .orderBy(
      sql`CASE WHEN ${boards.name} ILIKE ${`%${query}%`} THEN 1 ELSE 0 END DESC`,
      sql`similarity(${boards.name}, ${query}) DESC`,
      desc(boards.updatedAt),
    )
    .limit(Math.ceil(limit * 0.4));

  // Search for cards
  const cardResults = await db
    .select({
      publicId: cards.publicId,
      title: cards.title,
      description: cards.description,
      boardPublicId: boards.publicId,
      boardName: boards.name,
      listName: lists.name,
      updatedAt: cards.updatedAt,
      createdAt: cards.createdAt,
    })
    .from(cards)
    .innerJoin(lists, eq(cards.listId, lists.id))
    .innerJoin(boards, eq(lists.boardId, boards.id))
    .where(
      and(
        eq(boards.workspaceId, workspaceId),
        or(
          ilike(cards.title, searchQuery),
          sql`similarity(${cards.title}, ${query}) > 0.2`,
        ),
        isNull(cards.deletedAt),
        isNull(lists.deletedAt),
        isNull(boards.deletedAt),
      ),
    )
    .orderBy(
      sql`CASE WHEN ${cards.title} ILIKE ${searchQuery} THEN 1 ELSE 0 END DESC`,
      sql`similarity(${cards.title}, ${query}) DESC`,
      desc(cards.updatedAt),
    )
    .limit(Math.floor(limit * 0.6));

  // Combine results
  const allResults = [
    ...boardResults.map((board) => ({ ...board, type: "board" as const })),
    ...cardResults.map((card) => ({ ...card, type: "card" as const })),
  ];

  // Ensure we don't exceed the total limit
  return allResults.slice(0, limit);
};

export const getMembersWithEmailsByPublicIds = (
  db: dbClient,
  memberPublicIds: string[],
) => {
  return db.query.workspaceMembers.findMany({
    columns: {
      publicId: true,
      email: true,
      userId: true,
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
    where: and(
      inArray(workspaceMembers.publicId, memberPublicIds),
      isNull(workspaceMembers.deletedAt),
    ),
  });
};
