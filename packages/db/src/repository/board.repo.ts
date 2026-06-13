import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  or,
  sql,
} from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import type { BoardVisibilityStatus } from "@kan/db/schema";
import {
  boards,
  cardActivities,
  cardAttachments,
  cards,
  cardsToLabels,
  cardToWorkspaceMembers,
  checklistItems,
  checklists,
  comments,
  labels,
  lists,
  boardUsers,
  workspaceMembers,
} from "@kan/db/schema";
import { generateUID } from "@kan/shared/utils";

// Transaction handle type (the client passed to db.transaction callbacks).
// Used by helpers that must run inside an existing transaction.
type dbTx = Parameters<Parameters<dbClient["transaction"]>[0]>[0];

/**
 * Seed a board_user row for every active workspace member for a newly created
 * board. The new board is appended to the end of each user's non-favourite
 * group (within the board's type + archive scope).
 */
const seedBoardUsersForBoard = async (
  db: dbTx,
  args: { boardId: number; workspaceId: number },
) => {
  await db.execute(sql`
    INSERT INTO "board_user" ("userId", "boardId", "position", "isFavourite", "createdAt")
    SELECT
      wm."userId",
      ${args.boardId},
      COALESCE(
        (
          SELECT MAX(bu."position") + 1
          FROM "board_user" bu
          JOIN "board" b ON b."id" = bu."boardId"
          WHERE bu."userId" = wm."userId"
            AND b."workspaceId" = ${args.workspaceId}
            AND b."type" = (SELECT "type" FROM "board" WHERE "id" = ${args.boardId})
            AND b."isArchived" = (SELECT "isArchived" FROM "board" WHERE "id" = ${args.boardId})
            AND bu."isFavourite" = false
            AND b."deletedAt" IS NULL
            AND bu."boardId" != ${args.boardId}
        ),
        0
      ),
      false,
      now()
    FROM "workspace_members" wm
    WHERE wm."workspaceId" = ${args.workspaceId}
      AND wm."userId" IS NOT NULL
      AND wm."deletedAt" IS NULL
      AND wm."status" = 'active'
    ON CONFLICT ("userId", "boardId") DO NOTHING
  `);
};

export const getCount = async (db: dbClient) => {
  const result = await db
    .select({ count: count() })
    .from(boards)
    .where(isNull(boards.deletedAt));

  return result[0]?.count ?? 0;
};

export const getAllByWorkspaceId = async (
  db: dbClient,
  workspaceId: number,
  userId: string,
  opts?: { type?: "regular" | "template"; archived?: boolean },
) => {
  const boardsData = await db.query.boards.findMany({
    columns: {
      publicId: true,
      name: true,
    },
    with: {
      boardUsers: {
        where: eq(boardUsers.userId, userId),
        columns: {
          position: true,
          isFavourite: true,
        },
      },
      lists: {
        columns: {
          publicId: true,
          name: true,
          index: true,
        },
        orderBy: [asc(lists.index)],
      },
      labels: {
        columns: {
          publicId: true,
          name: true,
          colourCode: true,
        },
      },
    },
    where: and(
      eq(boards.workspaceId, workspaceId),
      isNull(boards.deletedAt),
      opts?.type ? eq(boards.type, opts.type) : undefined,
      opts?.archived !== undefined ? eq(boards.isArchived, opts.archived) : undefined,
    ),
  });

  // Transform and sort: favourites first, then by per-user position
  return boardsData
    .map((board) => ({
      ...board,
      favorite: board.boardUsers[0]?.isFavourite ?? false,
      position: board.boardUsers[0]?.position ?? 0,
      boardUsers: undefined,
    }))
    .sort((a, b) => {
      // Sort favourites first
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;
      // Then by per-user position
      return a.position - b.position;
    });
};

export const getIdByPublicId = async (db: dbClient, boardPublicId: string) => {
  const board = await db.query.boards.findFirst({
    columns: {
      id: true,
      type: true,
      isArchived: true,
    },
    where: eq(boards.publicId, boardPublicId),
  });

  return board;
};

interface DueDateFilter {
  startDate?: Date;
  endDate?: Date;
  hasNoDueDate?: boolean;
}

const buildDueDateWhere = (filters: DueDateFilter[]) => {
  if (!filters.length) return undefined;

  const clauses = filters
    .map((filter) => {
      const conditions: ReturnType<typeof and>[] = [];

      if (filter.hasNoDueDate) {
        conditions.push(isNull(cards.dueDate));
      } else {
        conditions.push(isNotNull(cards.dueDate));

        if (filter.startDate)
          conditions.push(gte(cards.dueDate, filter.startDate));

        if (filter.endDate) conditions.push(lt(cards.dueDate, filter.endDate));
      }

      return conditions.length > 0 ? and(...conditions) : undefined;
    })
    .filter((clause): clause is NonNullable<typeof clause> => !!clause);

  if (!clauses.length) return undefined;

  return or(...clauses);
};

export const getByPublicId = async (
  db: dbClient,
  boardPublicId: string,
  userId: string,
  filters: {
    members: string[];
    labels: string[];
    lists: string[];
    dueDate: DueDateFilter[];
    type: "regular" | "template" | undefined;
  },
) => {
  let cardIds: string[] = [];

  if (filters.labels.length > 0 || filters.members.length > 0) {
    const filteredCards = await db
      .select({
        publicId: cards.publicId,
      })
      .from(cards)
      .leftJoin(cardsToLabels, eq(cards.id, cardsToLabels.cardId))
      .leftJoin(labels, eq(cardsToLabels.labelId, labels.id))
      .leftJoin(
        cardToWorkspaceMembers,
        eq(cards.id, cardToWorkspaceMembers.cardId),
      )
      .leftJoin(
        workspaceMembers,
        eq(cardToWorkspaceMembers.workspaceMemberId, workspaceMembers.id),
      )
      .where(
        and(
          isNull(cards.deletedAt),
          or(
            filters.labels.length > 0
              ? inArray(labels.publicId, filters.labels)
              : undefined,
            filters.members.length > 0
              ? inArray(workspaceMembers.publicId, filters.members)
              : undefined,
          ),
        ),
      );

    cardIds = filteredCards.map((card) => card.publicId);
  }

  const board = await db.query.boards.findFirst({
    columns: {
      publicId: true,
      name: true,
      slug: true,
      visibility: true,
      isArchived: true,
    },
    with: {
      boardUsers: {
        where: eq(boardUsers.userId, userId),
        columns: {
          isFavourite: true,
        },
      },
      workspace: {
        columns: {
          publicId: true,
          cardPrefix: true,
        },
        with: {
          members: {
            columns: {
              publicId: true,
              email: true,
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
            where: isNull(workspaceMembers.deletedAt),
          },
        },
      },
      labels: {
        columns: {
          publicId: true,
          name: true,
          colourCode: true,
        },
        where: isNull(labels.deletedAt),
      },
      lists: {
        columns: {
          publicId: true,
          name: true,
          boardId: true,
          index: true,
        },
        with: {
          cards: {
            columns: {
              publicId: true,
              title: true,
              description: true,
              listId: true,
              index: true,
              dueDate: true,
              cardNumber: true,
            },
            with: {
              labels: {
                with: {
                  label: {
                    columns: {
                      publicId: true,
                      name: true,
                      colourCode: true,
                    },
                  },
                },
              },
              members: {
                with: {
                  member: {
                    columns: {
                      publicId: true,
                      email: true,
                      deletedAt: true,
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
              },
              attachments: {
                columns: {
                  publicId: true,
                },
                where: isNull(cardAttachments.deletedAt),
                orderBy: asc(cardAttachments.createdAt),
              },
              checklists: {
                columns: {
                  publicId: true,
                  name: true,
                  index: true,
                },
                where: isNull(checklists.deletedAt),
                orderBy: asc(checklists.index),
                with: {
                  items: {
                    columns: {
                      publicId: true,
                      title: true,
                      completed: true,
                      index: true,
                    },
                    where: isNull(checklistItems.deletedAt),
                    orderBy: asc(checklistItems.index),
                  },
                },
              },
              comments: {
                columns: {
                  publicId: true,
                },
                where: isNull(comments.deletedAt),
                limit: 1,
              },
            },
            where: and(
              cardIds.length > 0 ? inArray(cards.publicId, cardIds) : undefined,
              isNull(cards.deletedAt),
              buildDueDateWhere(filters.dueDate),
            ),
            orderBy: [asc(cards.index)],
          },
        },
        where: and(
          isNull(lists.deletedAt),
          filters.lists.length > 0
            ? inArray(lists.publicId, filters.lists)
            : undefined,
        ),
        orderBy: [asc(lists.index)],
      },
      allLists: {
        columns: {
          publicId: true,
          name: true,
        },
        where: isNull(lists.deletedAt),
        orderBy: [asc(lists.index)],
      },
    },
    where: and(
      eq(boards.publicId, boardPublicId),
      isNull(boards.deletedAt),
      eq(boards.type, filters.type ?? "regular"),
    ),
  });

  if (!board) return null;

  const formattedResult = {
    ...board,
    favorite: board.boardUsers[0]?.isFavourite ?? false,
    boardUsers: undefined,
    lists: board.lists.map((list) => ({
      ...list,
      cards: list.cards.map((card) => ({
        ...card,
        labels: card.labels.map((label) => label.label),
        members: card.members
          .map((member) => member.member)
          .filter((member) => member.deletedAt === null),
      })),
    })),
  };

  return formattedResult;
};

export const getBySlug = async (
  db: dbClient,
  boardSlug: string,
  workspaceId: number,
  filters: {
    members: string[];
    labels: string[];
    lists: string[];
    dueDate: DueDateFilter[];
  },
) => {
  let cardIds: string[] = [];

  if (filters.labels.length) {
    const filteredCards = await db
      .select({
        publicId: cards.publicId,
      })
      .from(cards)
      .leftJoin(cardsToLabels, eq(cards.id, cardsToLabels.cardId))
      .leftJoin(labels, eq(cardsToLabels.labelId, labels.id))
      .where(
        and(
          isNull(cards.deletedAt),
          filters.labels.length > 0
            ? inArray(labels.publicId, filters.labels)
            : undefined,
        ),
      );

    cardIds = filteredCards.map((card) => card.publicId);
  }

  const board = await db.query.boards.findFirst({
    columns: {
      publicId: true,
      name: true,
      slug: true,
      visibility: true,
    },
    with: {
      workspace: {
        columns: {
          publicId: true,
          name: true,
          slug: true,
          cardPrefix: true,
        },
      },
      labels: {
        columns: {
          publicId: true,
          name: true,
          colourCode: true,
        },
        where: isNull(labels.deletedAt),
      },
      lists: {
        columns: {
          publicId: true,
          name: true,
          boardId: true,
          index: true,
        },
        with: {
          cards: {
            columns: {
              publicId: true,
              title: true,
              description: true,
              listId: true,
              index: true,
              dueDate: true,
              cardNumber: true,
            },
            with: {
              labels: {
                with: {
                  label: {
                    columns: {
                      publicId: true,
                      name: true,
                      colourCode: true,
                    },
                  },
                },
              },
              attachments: {
                columns: {
                  publicId: true,
                },
                where: isNull(cardAttachments.deletedAt),
                orderBy: asc(cardAttachments.createdAt),
              },
              comments: {
                columns: {
                  publicId: true,
                },
                where: isNull(comments.deletedAt),
                limit: 1,
              },
              checklists: {
                columns: {
                  publicId: true,
                  name: true,
                  index: true,
                },
                where: isNull(checklists.deletedAt),
                orderBy: asc(checklists.index),
                with: {
                  items: {
                    columns: {
                      publicId: true,
                      title: true,
                      completed: true,
                      index: true,
                    },
                    where: isNull(checklistItems.deletedAt),
                    orderBy: asc(checklistItems.index),
                  },
                },
              },
            },
            where: and(
              cardIds.length > 0 ? inArray(cards.publicId, cardIds) : undefined,
              isNull(cards.deletedAt),
              buildDueDateWhere(filters.dueDate),
            ),
            orderBy: [asc(cards.index)],
          },
        },
        where: and(
          isNull(lists.deletedAt),
          filters.lists.length > 0
            ? inArray(lists.publicId, filters.lists)
            : undefined,
        ),
        orderBy: [asc(lists.index)],
      },
      allLists: {
        columns: {
          publicId: true,
          name: true,
        },
        where: isNull(lists.deletedAt),
        orderBy: [asc(lists.index)],
      },
    },
    where: and(
      eq(boards.slug, boardSlug),
      eq(boards.workspaceId, workspaceId),
      isNull(boards.deletedAt),
      eq(boards.visibility, "public"),
    ),
  });

  if (!board) return null;

  const formattedResult = {
    ...board,
    lists: board.lists.map((list) => ({
      ...list,
      cards: list.cards.map((card) => ({
        ...card,
        labels: card.labels.map((label) => label.label),
      })),
    })),
  };

  return formattedResult;
};

export const getWithListIdsByPublicId = (
  db: dbClient,
  boardPublicId: string,
) => {
  return db.query.boards.findFirst({
    columns: {
      id: true,
      workspaceId: true,
      createdBy: true,
    },
    with: {
      lists: {
        columns: {
          id: true,
        },
      },
    },
    where: eq(boards.publicId, boardPublicId),
  });
};

export const getWithLatestListIndexByPublicId = (
  db: dbClient,
  boardPublicId: string,
) => {
  return db.query.boards.findFirst({
    columns: {
      id: true,
      workspaceId: true,
    },
    with: {
      lists: {
        columns: {
          index: true,
        },
        where: isNull(lists.deletedAt),
        orderBy: [desc(lists.index)],
        limit: 1,
      },
    },
    where: eq(boards.publicId, boardPublicId),
  });
};

export const create = async (
  db: dbClient,
  boardInput: {
    publicId?: string;
    name: string;
    createdBy: string;
    workspaceId: number;
    importId?: number;
    slug: string;
    type?: "regular" | "template";
    sourceBoardId?: number;
  },
) => {
  return db.transaction(async (tx) => {
    const [result] = await tx
      .insert(boards)
      .values({
        publicId: boardInput.publicId ?? generateUID(),
        name: boardInput.name,
        createdBy: boardInput.createdBy,
        workspaceId: boardInput.workspaceId,
        importId: boardInput.importId,
        slug: boardInput.slug,
        type: boardInput.type ?? "regular",
        sourceBoardId: boardInput.sourceBoardId,
      })
      .returning({
        id: boards.id,
        publicId: boards.publicId,
        name: boards.name,
      });

    if (result) {
      await seedBoardUsersForBoard(tx, {
        boardId: result.id,
        workspaceId: boardInput.workspaceId,
      });
    }

    return result;
  });
};

export const update = async (
  db: dbClient,
  boardInput: {
    name: string | undefined;
    slug: string | undefined;
    visibility: BoardVisibilityStatus | undefined;
    boardPublicId: string;
    isArchived?: boolean;
  },
) => {
  const [result] = await db
    .update(boards)
    .set({
      name: boardInput.name,
      slug: boardInput.slug,
      visibility: boardInput.visibility,
      updatedAt: new Date(),
      ...(boardInput.isArchived !== undefined && { isArchived: boardInput.isArchived })
    })
    .where(eq(boards.publicId, boardInput.boardPublicId))
    .returning({
      publicId: boards.publicId,
      name: boards.name,
    });

  return result;
};

export const softDelete = async (
  db: dbClient,
  args: {
    boardId: number;
    deletedAt: Date;
    deletedBy: string;
  },
) => {
  return db.transaction(async (tx) => {
    const [result] = await tx
      .update(boards)
      .set({ deletedAt: args.deletedAt, deletedBy: args.deletedBy })
      .where(and(eq(boards.id, args.boardId), isNull(boards.deletedAt)))
      .returning({
        publicId: boards.publicId,
        name: boards.name,
        workspaceId: boards.workspaceId,
        type: boards.type,
        isArchived: boards.isArchived,
      });

    if (result) {
      // The board is now soft-deleted (deletedAt IS NOT NULL) so it is excluded
      // from the compaction below. Renumber the remaining boards' positions
      // (per user, per favourite group) to keep them contiguous from 0.
      await tx.execute(sql`
        WITH ordered AS (
          SELECT bu."userId", bu."boardId",
            ROW_NUMBER() OVER (
              PARTITION BY bu."userId", bu."isFavourite"
              ORDER BY bu."position"
            ) - 1 AS new_position
          FROM "board_user" bu
          JOIN "board" b ON b."id" = bu."boardId"
          WHERE b."workspaceId" = ${result.workspaceId}
            AND b."type" = ${result.type}
            AND b."isArchived" = ${result.isArchived}
            AND b."deletedAt" IS NULL
            AND bu."userId" IN (
              SELECT "userId" FROM "board_user" WHERE "boardId" = ${args.boardId}
            )
        )
        UPDATE "board_user" bu
        SET "position" = o.new_position
        FROM ordered o
        WHERE bu."userId" = o."userId" AND bu."boardId" = o."boardId"
      `);
    }

    return result
      ? { publicId: result.publicId, name: result.name }
      : undefined;
  });
};

export const hardDelete = async (db: dbClient, workspaceId: number) => {
  const [result] = await db
    .delete(boards)
    .where(eq(boards.workspaceId, workspaceId))
    .returning({
      publicId: boards.publicId,
      name: boards.name,
    });

  return result;
};

export const isSlugUnique = async (
  db: dbClient,
  args: { slug: string; workspaceId: number },
) => {
  const result = await db.query.boards.findFirst({
    columns: {
      slug: true,
    },
    where: and(
      eq(boards.slug, args.slug),
      eq(boards.workspaceId, args.workspaceId),
      isNull(boards.deletedAt),
    ),
  });

  return result === undefined;
};

export const getWorkspaceAndBoardIdByBoardPublicId = async (
  db: dbClient,
  boardPublicId: string,
) => {
  const result = await db.query.boards.findFirst({
    columns: {
      id: true,
      workspaceId: true,
      createdBy: true,
      type: true,
      isArchived: true,
    },
    where: eq(boards.publicId, boardPublicId),
  });

  return result;
};

export const isBoardSlugAvailable = async (
  db: dbClient,
  boardSlug: string,
  workspaceId: number,
) => {
  const result = await db.query.boards.findFirst({
    columns: {
      id: true,
    },
    where: and(
      eq(boards.slug, boardSlug),
      eq(boards.workspaceId, workspaceId),
      isNull(boards.deletedAt),
    ),
  });

  return result === undefined;
};

// Create a new board (regular/template) from a full board snapshot
export const createFromSnapshot = async (
  db: dbClient,
  args: {
    source: {
      name: string;
      labels: { publicId: string; name: string; colourCode: string | null }[];
      lists: {
        name: string;
        index: number;
        cards: {
          title: string;
          description: string | null;
          index: number;
          labels: {
            publicId: string;
            name: string;
            colourCode: string | null;
          }[];
          checklists?: {
            publicId: string;
            name: string;
            index: number;
            items: {
              publicId: string;
              title: string;
              completed: boolean;
              index: number;
            }[];
          }[];
        }[];
      }[];
    };
    workspaceId: number;
    createdBy: string;
    slug: string;
    name?: string;
    type: "regular" | "template";
    sourceBoardId?: number;
  },
) => {
  return db.transaction(async (tx) => {
    const [newBoard] = await tx
      .insert(boards)
      .values({
        publicId: generateUID(),
        name: args.name ?? args.source.name,
        slug: args.slug,
        createdBy: args.createdBy,
        workspaceId: args.workspaceId,
        type: args.type,
        sourceBoardId: args.sourceBoardId,
      })
      .returning({
        id: boards.id,
        publicId: boards.publicId,
        name: boards.name,
      });

    if (!newBoard) throw new Error("Failed to create board");

    await seedBoardUsersForBoard(tx, {
      boardId: newBoard.id,
      workspaceId: args.workspaceId,
    });

    // Labels
    const srcLabels = args.source.labels;
    const labelMap = new Map<string, number>();

    if (srcLabels.length) {
      const inserted = await tx
        .insert(labels)
        .values(
          srcLabels.map((l) => ({
            publicId: generateUID(),
            name: l.name,
            colourCode: l.colourCode ?? null,
            createdBy: args.createdBy,
            boardId: newBoard.id,
          })),
        )
        .returning({ id: labels.id });

      for (let i = 0; i < srcLabels.length; i++) {
        const src = srcLabels[i];

        if (!src) throw new Error("Source label not found");

        const created = inserted[i];
        if (created) labelMap.set(src.publicId, created.id);
      }
    }

    // Lists
    const listIndexToId = new Map<number, number>();
    const srcLists = [...args.source.lists].sort((a, b) => a.index - b.index);
    if (srcLists.length) {
      const insertedLists = await tx
        .insert(lists)
        .values(
          srcLists.map((list) => ({
            publicId: generateUID(),
            name: list.name,
            createdBy: args.createdBy,
            boardId: newBoard.id,
            index: list.index,
          })),
        )
        .returning({ id: lists.id, index: lists.index });

      for (const list of insertedLists) listIndexToId.set(list.index, list.id);
    }

    // Cards, card-labels, checklists
    for (const list of srcLists) {
      const newListId = listIndexToId.get(list.index);
      if (!newListId) continue;
      const sortedCards = [...list.cards].sort((a, b) => a.index - b.index);

      for (const card of sortedCards) {
        const [createdCard] = await tx
          .insert(cards)
          .values({
            publicId: generateUID(),
            title: card.title,
            description: card.description ?? "",
            createdBy: args.createdBy,
            listId: newListId,
            index: card.index,
          })
          .returning({ id: cards.id });

        if (!createdCard) throw new Error("Failed to create card");

        // Create card.created activity
        await tx.insert(cardActivities).values({
          publicId: generateUID(),
          type: "card.created",
          cardId: createdCard.id,
          createdBy: args.createdBy,
          sourceBoardId: args.sourceBoardId,
        });

        if (card.labels.length) {
          const cardLabels: { cardId: number; labelId: number }[] = [];
          for (const label of card.labels) {
            const newLabelId = labelMap.get(label.publicId);
            if (newLabelId)
              cardLabels.push({ cardId: createdCard.id, labelId: newLabelId });
          }
          if (cardLabels.length) {
            await tx.insert(cardsToLabels).values(cardLabels);

            // Create card.updated.label.added activities for each label
            const labelActivities = cardLabels.map((cardLabel) => ({
              publicId: generateUID(),
              type: "card.updated.label.added" as const,
              cardId: cardLabel.cardId,
              labelId: cardLabel.labelId,
              createdBy: args.createdBy,
              sourceBoardId: args.sourceBoardId,
            }));
            await tx.insert(cardActivities).values(labelActivities);
          }
        }

        if (card.checklists?.length) {
          const sortedChecklists = [...card.checklists].sort(
            (a, b) => a.index - b.index,
          );
          for (const checklist of sortedChecklists) {
            const [createdChecklist] = await tx
              .insert(checklists)
              .values({
                publicId: generateUID(),
                name: checklist.name,
                createdBy: args.createdBy,
                cardId: createdCard.id,
                index: checklist.index,
              })
              .returning({ id: checklists.id });

            if (!createdChecklist) continue;

            // Create card.updated.checklist.added activity
            await tx.insert(cardActivities).values({
              publicId: generateUID(),
              type: "card.updated.checklist.added",
              cardId: createdCard.id,
              toTitle: checklist.name,
              createdBy: args.createdBy,
              sourceBoardId: args.sourceBoardId,
            });

            if (checklist.items.length) {
              const itemValues = [...checklist.items]
                .sort((a, b) => a.index - b.index)
                .map((checklistItem) => ({
                  publicId: generateUID(),
                  title: checklistItem.title,
                  createdBy: args.createdBy,
                  checklistId: createdChecklist.id,
                  index: checklistItem.index,
                  completed: !!checklistItem.completed,
                }));

              if (itemValues.length) {
                await tx.insert(checklistItems).values(itemValues);

                // Create card.updated.checklist.item.added activities for each item
                const itemActivities = itemValues.map((item) => ({
                  publicId: generateUID(),
                  type: "card.updated.checklist.item.added" as const,
                  cardId: createdCard.id,
                  toTitle: item.title,
                  createdBy: args.createdBy,
                  sourceBoardId: args.sourceBoardId,
                }));
                await tx.insert(cardActivities).values(itemActivities);
              }
            }
          }
        }
      }
    }

    return newBoard;
  });
};

/**
 * Reorder a board to a new position within the current user's favourite group
 * (favourites and non-favourites keep separate position sequences, scoped per
 * user, board type and archive status).
 */
export const reorder = async (
  db: dbClient,
  args: {
    userId: string;
    boardPublicId: string;
    newPosition: number;
  },
) => {
  return db.transaction(async (tx) => {
    const board = await tx.query.boards.findFirst({
      columns: {
        id: true,
        workspaceId: true,
        type: true,
        isArchived: true,
      },
      where: eq(boards.publicId, args.boardPublicId),
    });

    if (!board)
      throw new Error(`Board not found for public ID ${args.boardPublicId}`);

    const boardUser = await tx.query.boardUsers.findFirst({
      columns: { position: true, isFavourite: true },
      where: and(
        eq(boardUsers.userId, args.userId),
        eq(boardUsers.boardId, board.id),
      ),
    });

    if (!boardUser) throw new Error(`board_user record not found`);

    const oldPosition = boardUser.position;
    const isFavourite = boardUser.isFavourite;

    await tx.execute(sql`
      WITH scoped AS (
        SELECT bu."boardId"
        FROM "board_user" bu
        JOIN "board" b ON b."id" = bu."boardId"
        WHERE bu."userId" = ${args.userId}
          AND b."workspaceId" = ${board.workspaceId}
          AND b."type" = ${board.type}
          AND b."isArchived" = ${board.isArchived}
          AND bu."isFavourite" = ${isFavourite}
          AND b."deletedAt" IS NULL
      )
      UPDATE "board_user" bu
      SET "position" =
        CASE
          WHEN bu."boardId" = ${board.id} THEN ${args.newPosition}
          WHEN ${oldPosition} < ${args.newPosition}
            AND bu."position" > ${oldPosition}
            AND bu."position" <= ${args.newPosition}
            THEN bu."position" - 1
          WHEN ${oldPosition} > ${args.newPosition}
            AND bu."position" >= ${args.newPosition}
            AND bu."position" < ${oldPosition}
            THEN bu."position" + 1
          ELSE bu."position"
        END
      WHERE bu."userId" = ${args.userId}
        AND bu."boardId" IN (SELECT "boardId" FROM scoped)
    `);

    // Defensive auto-heal: if any duplicate positions slipped in, compact.
    const countExpr = sql<number>`COUNT(*)`.mapWith(Number);
    const duplicates = await tx
      .select({ position: boardUsers.position, count: countExpr })
      .from(boardUsers)
      .innerJoin(boards, eq(boardUsers.boardId, boards.id))
      .where(
        and(
          eq(boardUsers.userId, args.userId),
          eq(boards.workspaceId, board.workspaceId),
          eq(boards.type, board.type),
          eq(boards.isArchived, board.isArchived),
          eq(boardUsers.isFavourite, isFavourite),
          isNull(boards.deletedAt),
        ),
      )
      .groupBy(boardUsers.position)
      .having(gt(countExpr, 1));

    if (duplicates.length > 0) {
      await tx.execute(sql`
        WITH ordered AS (
          SELECT bu."userId", bu."boardId",
            ROW_NUMBER() OVER (ORDER BY bu."position", bu."boardId") - 1 AS new_position
          FROM "board_user" bu
          JOIN "board" b ON b."id" = bu."boardId"
          WHERE bu."userId" = ${args.userId}
            AND b."workspaceId" = ${board.workspaceId}
            AND b."type" = ${board.type}
            AND b."isArchived" = ${board.isArchived}
            AND bu."isFavourite" = ${isFavourite}
            AND b."deletedAt" IS NULL
        )
        UPDATE "board_user" bu
        SET "position" = o.new_position
        FROM ordered o
        WHERE bu."userId" = o."userId" AND bu."boardId" = o."boardId"
      `);
    }

    const updatedBoard = await tx.query.boards.findFirst({
      columns: { publicId: true, name: true },
      where: eq(boards.publicId, args.boardPublicId),
    });

    return updatedBoard;
  });
};

/**
 * Toggle a board's favourite status for a user. The board moves to the end of
 * the target favourite group and the group it left is compacted.
 */
export const setFavourite = async (
  db: dbClient,
  args: {
    userId: string;
    boardId: number;
    isFavourite: boolean;
    workspaceId: number;
    boardType: "regular" | "template";
    isArchived: boolean;
  },
) => {
  return db.transaction(async (tx) => {
    const targetRows = await tx
      .select({ position: boardUsers.position })
      .from(boardUsers)
      .innerJoin(boards, eq(boardUsers.boardId, boards.id))
      .where(
        and(
          eq(boardUsers.userId, args.userId),
          eq(boards.workspaceId, args.workspaceId),
          eq(boards.type, args.boardType),
          eq(boards.isArchived, args.isArchived),
          eq(boardUsers.isFavourite, args.isFavourite),
          isNull(boards.deletedAt),
        ),
      );

    const maxPosition = targetRows.reduce(
      (max, row) => Math.max(max, row.position),
      -1,
    );

    await tx
      .insert(boardUsers)
      .values({
        userId: args.userId,
        boardId: args.boardId,
        position: maxPosition + 1,
        isFavourite: args.isFavourite,
      })
      .onConflictDoUpdate({
        target: [boardUsers.userId, boardUsers.boardId],
        set: { isFavourite: args.isFavourite, position: maxPosition + 1 },
      });

    // Compact the group the board just left.
    await tx.execute(sql`
      WITH ordered AS (
        SELECT bu."userId", bu."boardId",
          ROW_NUMBER() OVER (ORDER BY bu."position") - 1 AS new_position
        FROM "board_user" bu
        JOIN "board" b ON b."id" = bu."boardId"
        WHERE bu."userId" = ${args.userId}
          AND b."workspaceId" = ${args.workspaceId}
          AND b."type" = ${args.boardType}
          AND b."isArchived" = ${args.isArchived}
          AND bu."isFavourite" = ${!args.isFavourite}
          AND b."deletedAt" IS NULL
      )
      UPDATE "board_user" bu
      SET "position" = o.new_position
      FROM ordered o
      WHERE bu."userId" = o."userId" AND bu."boardId" = o."boardId"
    `);

    return { success: true };
  });
};

/**
 * Seed board_user rows for a user who has just joined a workspace, one per
 * non-deleted board, with sequential positions per board type + archive status.
 */
export const createBoardUsersForMember = async (
  db: dbClient,
  args: {
    userId: string;
    workspaceId: number;
  },
) => {
  await db.execute(sql`
    INSERT INTO "board_user" ("userId", "boardId", "position", "isFavourite", "createdAt")
    SELECT
      ${args.userId},
      b."id",
      (ROW_NUMBER() OVER (
        PARTITION BY b."type", b."isArchived"
        ORDER BY b."createdAt", b."id"
      ) - 1)::integer,
      false,
      now()
    FROM "board" b
    WHERE b."workspaceId" = ${args.workspaceId}
      AND b."deletedAt" IS NULL
    ON CONFLICT ("userId", "boardId") DO NOTHING
  `);
};

/**
 * After a board's archive status flips, move it to the end of the target
 * archive group (per user, preserving each user's favourite flag) and compact
 * the archive group it left. The board's isArchived column must already reflect
 * the new value when this runs.
 */
export const reassignPositionsOnArchiveToggle = async (
  db: dbClient,
  args: {
    boardId: number;
    workspaceId: number;
    boardType: "regular" | "template";
    newIsArchived: boolean;
  },
) => {
  return db.transaction(async (tx) => {
    // 1. Place the toggled board at the end of each user's target group.
    await tx.execute(sql`
      UPDATE "board_user" bu
      SET "position" = sub.new_position
      FROM (
        SELECT
          bu2."userId",
          COALESCE(
            (
              SELECT MAX(bu3."position") + 1
              FROM "board_user" bu3
              JOIN "board" b3 ON b3."id" = bu3."boardId"
              WHERE bu3."userId" = bu2."userId"
                AND b3."workspaceId" = ${args.workspaceId}
                AND b3."type" = ${args.boardType}
                AND b3."isArchived" = ${args.newIsArchived}
                AND bu3."isFavourite" = bu2."isFavourite"
                AND b3."deletedAt" IS NULL
                AND bu3."boardId" != ${args.boardId}
            ),
            0
          ) AS new_position
        FROM "board_user" bu2
        WHERE bu2."boardId" = ${args.boardId}
      ) sub
      WHERE bu."userId" = sub."userId" AND bu."boardId" = ${args.boardId}
    `);

    // 2. Compact the archive group the board just left.
    await tx.execute(sql`
      WITH ordered AS (
        SELECT bu."userId", bu."boardId",
          ROW_NUMBER() OVER (
            PARTITION BY bu."userId", bu."isFavourite"
            ORDER BY bu."position"
          ) - 1 AS new_position
        FROM "board_user" bu
        JOIN "board" b ON b."id" = bu."boardId"
        WHERE b."workspaceId" = ${args.workspaceId}
          AND b."type" = ${args.boardType}
          AND b."isArchived" = ${!args.newIsArchived}
          AND b."deletedAt" IS NULL
          AND bu."userId" IN (
            SELECT "userId" FROM "board_user" WHERE "boardId" = ${args.boardId}
          )
      )
      UPDATE "board_user" bu
      SET "position" = o.new_position
      FROM ordered o
      WHERE bu."userId" = o."userId" AND bu."boardId" = o."boardId"
    `);

    return { success: true };
  });
};