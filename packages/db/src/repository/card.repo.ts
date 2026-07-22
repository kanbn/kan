import type { dbClient } from "@banana/db/client";
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
  lte,
  sql,
} from "drizzle-orm";

import {
  boards,
  cardActivities,
  cardAttachments,
  cardBlocking,
  cards,
  cardsToLabels,
  cardToWorkspaceMembers,
  checklistItems,
  checklists,
  labels,
  lists,
  workspaceMembers,
  workspaces,
} from "@banana/db/schema";
import { generateUID } from "@banana/shared/utils";

export const getCount = async (db: dbClient) => {
  const result = await db
    .select({ count: count() })
    .from(cards)
    .where(isNull(cards.deletedAt));

  return result[0]?.count ?? 0;
};

export const create = async (
  db: dbClient,
  cardInput: {
    title: string;
    description: string;
    createdBy: string;
    listId: number;
    workspaceId: number;
    position: "start" | "end";
    dueDate?: Date | null;
  },
) => {
  return db.transaction(async (tx) => {
    let index = 0;

    if (cardInput.position === "end") {
      const lastCard = await tx.query.cards.findFirst({
        columns: {
          index: true,
        },
        where: and(eq(cards.listId, cardInput.listId), isNull(cards.deletedAt)),
        orderBy: desc(cards.index),
      });

      if (lastCard) index = lastCard.index + 1;
    }

    const getExistingCardAtIndex = async () =>
      tx.query.cards.findFirst({
        columns: {
          id: true,
        },
        where: and(
          eq(cards.listId, cardInput.listId),
          eq(cards.index, index),
          isNull(cards.deletedAt),
        ),
      });

    const existingCardAtIndex = await getExistingCardAtIndex();

    if (existingCardAtIndex?.id) {
      await tx.execute(sql`
        UPDATE card
        SET index = index + 1
        WHERE "listId" = ${cardInput.listId} AND index >= ${index} AND "deletedAt" IS NULL;
      `);
    }

    const [counterResult] = await tx
      .update(workspaces)
      .set({ cardCounter: sql`${workspaces.cardCounter} + 1` })
      .where(eq(workspaces.id, cardInput.workspaceId))
      .returning({ cardCounter: workspaces.cardCounter });

    if (!counterResult)
      throw new Error(`Workspace ${cardInput.workspaceId} not found`);

    const cardNumber = counterResult.cardCounter;

    const result = await tx
      .insert(cards)
      .values({
        publicId: generateUID(),
        title: cardInput.title,
        description: cardInput.description,
        createdBy: cardInput.createdBy,
        listId: cardInput.listId,
        index: index,
        cardNumber,
        dueDate: cardInput.dueDate ?? null,
      })
      .returning({
        id: cards.id,
        listId: cards.listId,
        publicId: cards.publicId,
        cardNumber: cards.cardNumber,
      });

    if (!result[0]) throw new Error("Unable to create card");

    await tx.insert(cardActivities).values({
      publicId: generateUID(),
      cardId: result[0].id,
      type: "card.created",
      createdBy: cardInput.createdBy,
    });

    const countExpr = sql<number>`COUNT(*)`.mapWith(Number);

    const duplicateIndices = await tx
      .select({
        index: cards.index,
        count: countExpr,
      })
      .from(cards)
      .where(and(eq(cards.listId, result[0].listId), isNull(cards.deletedAt)))
      .groupBy(cards.listId, cards.index)
      .having(gt(countExpr, 1));

    if (duplicateIndices.length > 0) {
      // Compact indices for this list to sequential values (0..n-1) preserving order
      await tx.execute(sql`
        WITH ordered AS (
          SELECT id, ROW_NUMBER() OVER (ORDER BY "index", id) - 1 AS new_index
          FROM "card"
          WHERE "listId" = ${result[0].listId} AND "deletedAt" IS NULL
        )
        UPDATE "card" c
        SET "index" = o.new_index
        FROM ordered o
        WHERE c.id = o.id;
      `);

      // Last resort: verify fix; rollback if duplicates persist
      const postFixDupes = await tx
        .select({ index: cards.index, count: countExpr })
        .from(cards)
        .where(and(eq(cards.listId, result[0].listId), isNull(cards.deletedAt)))
        .groupBy(cards.listId, cards.index)
        .having(gt(countExpr, 1));

      if (postFixDupes.length > 0) {
        throw new Error(
          `Invariant violation: duplicate card indices remain after compaction in list ${result[0].listId}`,
        );
      }
    }

    return result[0];
  });
};

export const bulkCreateCardLabelRelationships = async (
  db: dbClient,
  cardLabelRelationshipInput: {
    cardId: number;
    labelId: number;
  }[],
) => {
  const result = await db
    .insert(cardsToLabels)
    .values(cardLabelRelationshipInput)
    .returning();

  return result;
};

export const bulkCreateCardWorkspaceMemberRelationships = async (
  db: dbClient,
  cardWorkspaceMemberRelationshipInput: {
    cardId: number;
    workspaceMemberId: number;
  }[],
) => {
  const result = await db
    .insert(cardToWorkspaceMembers)
    .values(cardWorkspaceMemberRelationshipInput)
    .returning();

  return result;
};

export const update = async (
  db: dbClient,
  cardInput: {
    title?: string;
    description?: string;
    dueDate?: Date | null;
    isDone?: boolean;
  },
  args: {
    cardPublicId: string;
  },
) => {
  const [result] = await db
    .update(cards)
    .set({
      title: cardInput.title,
      description: cardInput.description,
      dueDate: cardInput.dueDate !== undefined ? cardInput.dueDate : undefined,
      ...(cardInput.isDone !== undefined && { isDone: cardInput.isDone }),
      updatedAt: new Date(),
    })
    .where(and(eq(cards.publicId, args.cardPublicId), isNull(cards.deletedAt)))
    .returning({
      id: cards.id,
      publicId: cards.publicId,
      title: cards.title,
      description: cards.description,
      dueDate: cards.dueDate,
      isDone: cards.isDone,
    });

  return result;
};

export const getCardWithListByPublicId = (
  db: dbClient,
  cardPublicId: string,
) => {
  return db.query.cards.findFirst({
    columns: {
      id: true,
      index: true,
    },
    with: {
      list: {
        columns: {
          id: true,
          boardId: true,
        },
      },
    },
    where: and(eq(cards.publicId, cardPublicId), isNull(cards.deletedAt)),
  });
};

export const getByPublicId = (db: dbClient, cardPublicId: string) => {
  return db.query.cards.findFirst({
    columns: {
      id: true,
      publicId: true,
      title: true,
      description: true,
      listId: true,
      dueDate: true,
      isDone: true,
    },
    with: {
      list: {
        columns: {
          publicId: true,
          name: true,
        },
      },
    },
    where: eq(cards.publicId, cardPublicId),
  });
};

export const getCardLabelRelationship = async (
  db: dbClient,
  args: { cardId: number; labelId: number },
) => {
  return db.query.cardsToLabels.findFirst({
    where: and(
      eq(cardsToLabels.cardId, args.cardId),
      eq(cardsToLabels.labelId, args.labelId),
    ),
  });
};

export const bulkCreate = async (
  db: dbClient,
  cardInput: {
    publicId: string;
    title: string;
    description: string;
    createdBy: string;
    listId: number;
    workspaceId: number;
    index: number;
    importId?: number;
  }[],
) => {
  if (cardInput.length === 0) return [];

  return db.transaction(async (tx) => {
    // Group incoming cards by list to compute safe, sequential indices per list
    const byList = new Map<number, typeof cardInput>();
    for (const item of cardInput) {
      const arr = byList.get(item.listId) ?? [];
      arr.push(item);
      byList.set(item.listId, arr);
    }

    // Atomically reserve a contiguous range of cardNumbers per workspace by
    // bumping cardCounter once per workspace.
    const countsByWorkspace = new Map<number, number>();
    for (const item of cardInput) {
      countsByWorkspace.set(
        item.workspaceId,
        (countsByWorkspace.get(item.workspaceId) ?? 0) + 1,
      );
    }

    const cardNumberByWorkspaceQueue = new Map<number, number[]>();
    for (const [workspaceId, count] of countsByWorkspace.entries()) {
      const [counterResult] = await tx
        .update(workspaces)
        .set({ cardCounter: sql`${workspaces.cardCounter} + ${count}` })
        .where(eq(workspaces.id, workspaceId))
        .returning({ cardCounter: workspaces.cardCounter });

      if (!counterResult) throw new Error(`Workspace ${workspaceId} not found`);

      const last = counterResult.cardCounter;
      const start = last - count + 1;
      const queue: number[] = [];
      for (let n = start; n <= last; n++) queue.push(n);
      cardNumberByWorkspaceQueue.set(workspaceId, queue);
    }

    const allValuesToInsert: {
      publicId: string;
      title: string;
      description: string;
      createdBy: string;
      listId: number;
      index: number;
      cardNumber: number;
      importId?: number;
    }[] = [];

    // For each list, append incoming cards after current max index, preserving incoming order
    for (const [listId, items] of byList.entries()) {
      const last = await tx.query.cards.findFirst({
        columns: { index: true },
        where: and(eq(cards.listId, listId), isNull(cards.deletedAt)),
        orderBy: [desc(cards.index)],
      });

      let nextIndex = last ? last.index + 1 : 0;
      const sorted = [...items].sort((a, b) => a.index - b.index);
      for (const it of sorted) {
        const queue = cardNumberByWorkspaceQueue.get(it.workspaceId);
        const cardNumber = queue?.shift();
        if (cardNumber === undefined)
          throw new Error(
            `Failed to allocate cardNumber for workspace ${it.workspaceId}`,
          );
        allValuesToInsert.push({
          publicId: it.publicId,
          title: it.title,
          description: it.description,
          createdBy: it.createdBy,
          listId: it.listId,
          index: nextIndex++,
          cardNumber,
          importId: it.importId,
        });
      }
    }

    const inserted = await tx
      .insert(cards)
      .values(allValuesToInsert)
      .returning({ id: cards.id });

    // Post-insert: compact per list if duplicates exist; then verify
    const countExpr = sql<number>`COUNT(*)`.mapWith(Number);
    for (const listId of byList.keys()) {
      const duplicateIndices = await tx
        .select({ index: cards.index, count: countExpr })
        .from(cards)
        .where(and(eq(cards.listId, listId), isNull(cards.deletedAt)))
        .groupBy(cards.listId, cards.index)
        .having(gt(countExpr, 1));

      if (duplicateIndices.length > 0) {
        await tx.execute(sql`
          WITH ordered AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY "index", id) - 1 AS new_index
            FROM "card"
            WHERE "listId" = ${listId} AND "deletedAt" IS NULL
          )
          UPDATE "card" c
          SET "index" = o.new_index
          FROM ordered o
          WHERE c.id = o.id;
        `);

        const postFixDupes = await tx
          .select({ index: cards.index, count: countExpr })
          .from(cards)
          .where(and(eq(cards.listId, listId), isNull(cards.deletedAt)))
          .groupBy(cards.listId, cards.index)
          .having(gt(countExpr, 1));

        if (postFixDupes.length > 0) {
          throw new Error(
            `Invariant violation: duplicate card indices remain after compaction in list ${listId}`,
          );
        }
      }
    }

    return inserted;
  });
};

export const createCardLabelRelationship = async (
  db: dbClient,
  cardLabelRelationshipInput: { cardId: number; labelId: number },
) => {
  const [result] = await db
    .insert(cardsToLabels)
    .values({
      cardId: cardLabelRelationshipInput.cardId,
      labelId: cardLabelRelationshipInput.labelId,
    })
    .returning();

  return result;
};

export const bulkCreateCardLabelRelationship = async (
  db: dbClient,
  cardLabelRelationshipInput: { cardId: number; labelId: number }[],
) => {
  const [result] = await db
    .insert(cardsToLabels)
    .values(cardLabelRelationshipInput)
    .returning();

  return result;
};

export const getCardMemberRelationship = (
  db: dbClient,
  args: { cardId: number; memberId: number },
) => {
  return db.query.cardToWorkspaceMembers.findFirst({
    where: and(
      eq(cardToWorkspaceMembers.cardId, args.cardId),
      eq(cardToWorkspaceMembers.workspaceMemberId, args.memberId),
    ),
  });
};

export const createCardMemberRelationship = async (
  db: dbClient,
  cardMemberRelationshipInput: { cardId: number; memberId: number },
) => {
  const [result] = await db
    .insert(cardToWorkspaceMembers)
    .values({
      cardId: cardMemberRelationshipInput.cardId,
      workspaceMemberId: cardMemberRelationshipInput.memberId,
    })
    .returning();

  return { success: !!result };
};

export const getCardBlockerRelationship = async (
  db: dbClient,
  args: { cardId: number; blockerCardId: number },
) => {
  return db.query.cardBlocking.findFirst({
    where: and(
      eq(cardBlocking.cardId, args.cardId),
      eq(cardBlocking.blockerCardId, args.blockerCardId),
    ),
  });
};

export const createCardBlockerRelationship = async (
  db: dbClient,
  cardBlockerRelationshipInput: { cardId: number; blockerCardId: number },
) => {
  const [result] = await db
    .insert(cardBlocking)
    .values({
      cardId: cardBlockerRelationshipInput.cardId,
      blockerCardId: cardBlockerRelationshipInput.blockerCardId,
    })
    .returning();

  return result;
};

export const getWithListAndMembersByPublicId = async (
  db: dbClient,
  cardPublicId: string,
) => {
  const card = await db.query.cards.findFirst({
    columns: {
      id: true,
      publicId: true,
      title: true,
      description: true,
      dueDate: true,
      createdBy: true,
      cardNumber: true,
      isDone: true,
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
          contentType: true,
          s3Key: true,
          originalFilename: true,
          size: true,
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
            with: {
              blockedBy: {
                with: {
                  blocker: {
                    columns: {
                      publicId: true,
                      title: true,
                      cardNumber: true,
                      isDone: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      blockedBy: {
        with: {
          blocker: {
            columns: {
              publicId: true,
              title: true,
              cardNumber: true,
              isDone: true,
            },
          },
        },
      },
      list: {
        columns: {
          publicId: true,
          name: true,
        },
        with: {
          board: {
            columns: {
              publicId: true,
              name: true,
            },
            with: {
              labels: {
                columns: {
                  publicId: true,
                  colourCode: true,
                  name: true,
                },
                where: isNull(labels.deletedAt),
              },
              lists: {
                columns: {
                  publicId: true,
                  name: true,
                  isDoneList: true,
                },
                where: isNull(lists.deletedAt),
                orderBy: asc(lists.index),
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
            },
          },
        },
        // https://github.com/drizzle-team/drizzle-orm/issues/2903
        // where: isNull(lists.deletedAt),
      },
      members: {
        with: {
          member: {
            columns: {
              publicId: true,
              email: true,
            },
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                },
              },
            },
            // https://github.com/drizzle-team/drizzle-orm/issues/2903
            // where: isNull(workspaceMembers.deletedAt),
          },
        },
      },
      activities: {
        columns: {
          publicId: true,
          type: true,
          createdAt: true,
          fromIndex: true,
          toIndex: true,
          fromTitle: true,
          toTitle: true,
          fromDescription: true,
          toDescription: true,
          fromDueDate: true,
          toDueDate: true,
        },
        with: {
          fromList: {
            columns: {
              publicId: true,
              name: true,
              index: true,
            },
          },
          toList: {
            columns: {
              publicId: true,
              name: true,
              index: true,
            },
          },
          label: {
            columns: {
              publicId: true,
              name: true,
            },
          },
          member: {
            columns: {
              publicId: true,
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
          },
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
          comment: {
            columns: {
              publicId: true,
              comment: true,
              createdBy: true,
              updatedAt: true,
              deletedAt: true,
            },
            // https://github.com/drizzle-team/drizzle-orm/issues/2903
            // where: isNull(comments.deletedAt),
          },
        },
      },
    },
    where: and(eq(cards.publicId, cardPublicId), isNull(cards.deletedAt)),
  });

  if (!card) return null;

  // Cards that THIS card is blocking — the union of direct card-to-card
  // blocking (_card_blocking) and cards whose checklist items are blocked by
  // this card (_checklist_item_blocking). Deduped by publicId.
  const blocking = await db.execute(sql`
    SELECT DISTINCT c."publicId", c."title", c."cardNumber", c."isDone"
    FROM "card" c
    WHERE c."deletedAt" IS NULL AND (
      c."id" IN (SELECT "cardId" FROM "_card_blocking" WHERE "blockerCardId" = ${card.id})
      OR c."id" IN (
        SELECT ccl2."cardId"
        FROM "_checklist_item_blocking" cb
        JOIN "card_checklist_item" cci2 ON cci2."id" = cb."checklistItemId"
        JOIN "card_checklist" ccl2 ON ccl2."id" = cci2."checklistId"
        WHERE cb."blockerCardId" = ${card.id}
      )
    )
  `);

  const formattedResult = {
    ...card,
    labels: card.labels.map((label) => label.label),
    members: card.members.map((member) => member.member),
    activities: card.activities.filter(
      (activity) => !activity.comment?.deletedAt,
    ),
    blockedBy: (card.blockedBy ?? []).map((b) => b.blocker),
    blocking: (blocking?.rows ?? []).map((row) => ({
      publicId: row.publicId as string,
      title: row.title as string,
      cardNumber: row.cardNumber as number | null,
      isDone: row.isDone as boolean,
    })),
    checklists: card.checklists.map((checklist) => ({
      ...checklist,
      items: checklist.items.map((item) => ({
        ...item,
        blockedBy: (item.blockedBy ?? []).map((b) => b.blocker),
      })),
    })),
  };

  return formattedResult;
};

export const reorder = async (
  db: dbClient,
  args: {
    newListId: number | undefined;
    newIndex: number | undefined;
    cardId: number;
  },
) => {
  return db.transaction(async (tx) => {
    const card = await tx.query.cards.findFirst({
      columns: {
        id: true,
        index: true,
      },
      where: and(eq(cards.id, args.cardId), isNull(cards.deletedAt)),
      with: {
        list: {
          columns: {
            id: true,
            index: true,
          },
        },
      },
    });

    if (!card?.list)
      throw new Error(`Card not found for public ID ${args.cardId}`);

    const currentList = card.list;
    const currentIndex = card.index;
    let newList:
      | { id: number; index: number; cards: { id: number; index: number }[] }
      | undefined;

    if (args.newListId) {
      newList = await tx.query.lists.findFirst({
        columns: {
          id: true,
          index: true,
        },
        with: {
          cards: {
            columns: {
              id: true,
              index: true,
            },
            orderBy: desc(cards.index),
            limit: 1,
          },
        },
        where: and(eq(lists.id, args.newListId), isNull(lists.deletedAt)),
      });

      if (!newList)
        throw new Error(`List not found for public ID ${args.newListId}`);
    }

    let newIndex = args.newIndex;

    if (newIndex === undefined) {
      const lastCardIndex = newList?.cards.length
        ? newList.cards[0]?.index
        : undefined;

      newIndex = lastCardIndex !== undefined ? lastCardIndex + 1 : 0;
    }

    if (currentList.id === newList?.id) {
      await tx.execute(sql`
        UPDATE card
        SET index =
          CASE
            WHEN index = ${currentIndex} THEN ${newIndex}
            WHEN ${currentIndex} < ${newIndex} AND index > ${currentIndex} AND index <= ${newIndex} THEN index - 1
            WHEN ${currentIndex} > ${newIndex} AND index >= ${newIndex} AND index < ${currentIndex} THEN index + 1
            ELSE index
          END
        WHERE "listId" = ${currentList.id} AND "deletedAt" IS NULL;
      `);
    } else {
      await tx.execute(sql`
        UPDATE card
        SET index = index + 1
        WHERE "listId" = ${newList?.id} AND index >= ${newIndex} AND "deletedAt" IS NULL;
      `);

      await tx.execute(sql`
        UPDATE card
        SET index = index - 1
        WHERE "listId" = ${currentList.id} AND index >= ${currentIndex} AND "deletedAt" IS NULL;
      `);

      await tx.execute(sql`
        UPDATE card
        SET "listId" = ${newList?.id}, index = ${newIndex}
        WHERE id = ${card.id} AND "deletedAt" IS NULL;
      `);
    }

    const countExpr = sql<number>`COUNT(*)`.mapWith(Number);

    const duplicateIndices = await tx
      .select({
        index: cards.index,
        count: countExpr,
      })
      .from(cards)
      .where(
        and(
          inArray(
            cards.listId,
            [currentList.id, newList?.id].filter((id) => id !== undefined),
          ),
          isNull(cards.deletedAt),
        ),
      )
      .groupBy(cards.listId, cards.index)
      .having(gt(countExpr, 1));

    if (duplicateIndices.length > 0) {
      // Auto-heal by compacting indices for the affected list(s)
      const affectedListIds = [currentList.id, newList?.id].filter(
        (id): id is number => id !== undefined,
      );

      if (affectedListIds.length === 1) {
        await tx.execute(sql`
          WITH ordered AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY "index", id) - 1 AS new_index
            FROM "card"
            WHERE "listId" = ${affectedListIds[0]} AND "deletedAt" IS NULL
          )
          UPDATE "card" c
          SET "index" = o.new_index
          FROM ordered o
          WHERE c.id = o.id;
        `);
      } else if (affectedListIds.length === 2) {
        await tx.execute(sql`
          WITH ordered AS (
            SELECT id,
                   ROW_NUMBER() OVER (PARTITION BY "listId" ORDER BY "index", id) - 1 AS new_index
            FROM "card"
            WHERE "listId" IN (${sql.join(affectedListIds, sql`,`)}) AND "deletedAt" IS NULL
          )
          UPDATE "card" c
          SET "index" = o.new_index
          FROM ordered o
          WHERE c.id = o.id;
        `);
      }

      // Verify fix and rollback if necessary
      const postFixDupes = await tx
        .select({ index: cards.index, count: countExpr })
        .from(cards)
        .where(
          and(inArray(cards.listId, affectedListIds), isNull(cards.deletedAt)),
        )
        .groupBy(cards.listId, cards.index)
        .having(gt(countExpr, 1));

      if (postFixDupes.length > 0) {
        throw new Error(
          `Invariant violation: duplicate card indices remain after compaction for card ${card.id}`,
        );
      }
    }

    const updatedCard = await tx.query.cards.findFirst({
      columns: {
        id: true,
        publicId: true,
        title: true,
        description: true,
        dueDate: true,
      },
      where: eq(cards.id, card.id),
    });

    return updatedCard;
  });
};

export const softDelete = async (
  db: dbClient,
  args: {
    cardId: number;
    deletedAt: Date;
    deletedBy: string;
  },
) => {
  return db.transaction(async (tx) => {
    const [result] = await tx
      .update(cards)
      .set({ deletedAt: args.deletedAt, deletedBy: args.deletedBy })
      .where(eq(cards.id, args.cardId))
      .returning({
        id: cards.id,
        listId: cards.listId,
        index: cards.index,
      });

    if (!result)
      throw new Error(`Unable to soft delete card ID ${args.cardId}`);

    await tx.execute(sql`
      UPDATE card
      SET index = index - 1
      WHERE "listId" = ${result.listId} AND index > ${result.index} AND "deletedAt" IS NULL;
    `);

    const countExpr = sql<number>`COUNT(*)`.mapWith(Number);

    const duplicateIndices = await tx
      .select({
        index: cards.index,
        count: countExpr,
      })
      .from(cards)
      .where(and(eq(cards.listId, result.listId), isNull(cards.deletedAt)))
      .groupBy(cards.listId, cards.index)
      .having(gt(countExpr, 1));

    if (duplicateIndices.length > 0) {
      throw new Error(
        `Duplicate indices found after soft deleting ${result.id}`,
      );
    }

    return result;
  });
};

export const softDeleteAllByListIds = async (
  db: dbClient,
  args: {
    listIds: number[];
    deletedAt: Date;
    deletedBy: string;
  },
) => {
  const updatedCards = await db
    .update(cards)
    .set({ deletedAt: args.deletedAt, deletedBy: args.deletedBy })
    .where(and(inArray(cards.listId, args.listIds), isNull(cards.deletedAt)))
    .returning({
      id: cards.id,
    });

  return updatedCards;
};

export const getCardsByListIds = (
  db: dbClient,
  listIds: number[],
): Promise<
  {
    id: number;
    publicId: string;
    title: string;
    description: string | null;
    dueDate: Date | null;
  }[]
> => {
  return db
    .select({
      id: cards.id,
      publicId: cards.publicId,
      title: cards.title,
      description: cards.description,
      dueDate: cards.dueDate,
    })
    .from(cards)
    .where(and(inArray(cards.listId, listIds), isNull(cards.deletedAt)));
};

export const hardDeleteCardMemberRelationship = async (
  db: dbClient,
  args: { cardId: number; memberId: number },
) => {
  const [result] = await db
    .delete(cardToWorkspaceMembers)
    .where(
      and(
        eq(cardToWorkspaceMembers.cardId, args.cardId),
        eq(cardToWorkspaceMembers.workspaceMemberId, args.memberId),
      ),
    )
    .returning();

  return { success: !!result };
};

export const hardDeleteCardLabelRelationship = async (
  db: dbClient,
  args: { cardId: number; labelId: number },
) => {
  const [result] = await db
    .delete(cardsToLabels)
    .where(
      and(
        eq(cardsToLabels.cardId, args.cardId),
        eq(cardsToLabels.labelId, args.labelId),
      ),
    )
    .returning();

  return result;
};

export const hardDeleteAllCardLabelRelationships = async (
  db: dbClient,
  labelId: number,
) => {
  const [result] = await db
    .delete(cardsToLabels)
    .where(eq(cardsToLabels.labelId, labelId))
    .returning();

  return result;
};

export const hardDeleteCardBlockerRelationship = async (
  db: dbClient,
  args: { cardId: number; blockerCardId: number },
) => {
  const [result] = await db
    .delete(cardBlocking)
    .where(
      and(
        eq(cardBlocking.cardId, args.cardId),
        eq(cardBlocking.blockerCardId, args.blockerCardId),
      ),
    )
    .returning();

  return result;
};

/**
 * Would adding "cardId is blocked by blockerCardId" create a cycle?
 * Walks the blockerCardId's own blockers transitively (bounded depth);
 * true if cardId is reachable (i.e. blockerCardId is already blocked by cardId).
 */
export const wouldCreateCycle = async (
  db: dbClient,
  args: { cardId: number; blockerCardId: number },
) => {
  const result = await db.execute(sql`
    WITH RECURSIVE chain(depth, blockerId) AS (
      SELECT 1, "blockerCardId"
      FROM "_card_blocking"
      WHERE "cardId" = ${args.blockerCardId}
      UNION ALL
      SELECT c.depth + 1, cb."blockerCardId"
      FROM chain c
      JOIN "_card_blocking" cb ON cb."cardId" = c.blockerId
      WHERE c.depth < 16
    )
    SELECT 1 AS hit FROM chain WHERE blockerId = ${args.cardId} LIMIT 1
  `);

  return (result?.rows?.length ?? 0) > 0;
};

export const getWorkspaceAndCardIdByCardPublicId = async (
  db: dbClient,
  cardPublicId: string,
) => {
  const result = await db.query.cards.findFirst({
    columns: { id: true, createdBy: true, dueDate: true },
    where: and(eq(cards.publicId, cardPublicId), isNull(cards.deletedAt)),
    with: {
      list: {
        columns: { name: true, publicId: true },
        with: {
          board: {
            columns: {
              publicId: true,
              workspaceId: true,
              visibility: true,
              name: true,
            },
          },
        },
      },
    },
  });

  return result
    ? {
        id: result.id,
        createdBy: result.createdBy,
        dueDate: result.dueDate,
        workspaceId: result.list.board.workspaceId,
        workspaceVisibility: result.list.board.visibility,
        listPublicId: result.list.publicId,
        listName: result.list.name,
        boardPublicId: result.list.board.publicId,
        boardName: result.list.board.name,
      }
    : null;
};

export const getCalendarCards = async (
  db: dbClient,
  args: {
    workspaceId: number;
    boardId?: number;
    startDate: Date;
    endDate: Date;
    userId?: string;
  },
) => {
  const conditions = [
    isNotNull(cards.dueDate),
    isNull(cards.deletedAt),
    gte(cards.dueDate, args.startDate),
    lte(cards.dueDate, args.endDate),
    isNull(lists.deletedAt),
    isNull(boards.deletedAt),
    eq(boards.workspaceId, args.workspaceId),
  ];

  if (args.boardId) {
    conditions.push(eq(boards.id, args.boardId));
  }

  const query = db
    .select({
      publicId: cards.publicId,
      title: cards.title,
      dueDate: cards.dueDate,
      boardPublicId: boards.publicId,
      boardName: boards.name,
      labelName: labels.name,
      labelColourCode: labels.colourCode,
    })
    .from(cards)
    .innerJoin(lists, eq(cards.listId, lists.id))
    .innerJoin(boards, eq(lists.boardId, boards.id))
    .leftJoin(cardsToLabels, eq(cards.id, cardsToLabels.cardId))
    .leftJoin(labels, eq(cardsToLabels.labelId, labels.id));

  if (args.userId) {
    query
      .innerJoin(
        cardToWorkspaceMembers,
        eq(cards.id, cardToWorkspaceMembers.cardId),
      )
      .innerJoin(
        workspaceMembers,
        and(
          eq(cardToWorkspaceMembers.workspaceMemberId, workspaceMembers.id),
          eq(workspaceMembers.userId, args.userId),
          isNull(workspaceMembers.deletedAt),
        ),
      );
  }

  const rows = await query
    .where(and(...conditions))
    .orderBy(asc(cards.dueDate), asc(cards.index));

  const cardMap = new Map<
    string,
    {
      publicId: string;
      title: string;
      dueDate: Date | null;
      boardPublicId: string;
      boardName: string;
      labels: { name: string; colourCode: string | null }[];
    }
  >();

  for (const row of rows) {
    if (!cardMap.has(row.publicId)) {
      cardMap.set(row.publicId, {
        publicId: row.publicId,
        title: row.title,
        dueDate: row.dueDate,
        boardPublicId: row.boardPublicId,
        boardName: row.boardName,
        labels: [],
      });
    }
    if (row.labelName) {
      cardMap.get(row.publicId)!.labels.push({
        name: row.labelName,
        colourCode: row.labelColourCode,
      });
    }
  }

  return Array.from(cardMap.values());
};

export const getAssignedCardsByUserId = async (
  db: dbClient,
  args: {
    workspaceId: number;
    userId: string;
    limit: number;
    cursor?: Date;
  },
) => {
  // First find the workspace member ID for this user in this workspace
  const [member] = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, args.userId),
        eq(workspaceMembers.workspaceId, args.workspaceId),
        eq(workspaceMembers.status, "active"),
        isNull(workspaceMembers.deletedAt),
      ),
    )
    .limit(1);

  if (!member) return { cards: [], hasMore: false, nextCursor: undefined };

  const conditions = [
    isNull(cards.deletedAt),
    isNull(lists.deletedAt),
    isNull(boards.deletedAt),
    eq(boards.workspaceId, args.workspaceId),
  ];

  if (args.cursor) {
    conditions.push(gt(cards.updatedAt, args.cursor));
  }

  const rows = await db
    .select({
      publicId: cards.publicId,
      title: cards.title,
      dueDate: cards.dueDate,
      updatedAt: cards.updatedAt,
      boardPublicId: boards.publicId,
      boardName: boards.name,
      listPublicId: lists.publicId,
      listName: lists.name,
      labelName: labels.name,
      labelColourCode: labels.colourCode,
    })
    .from(cardToWorkspaceMembers)
    .innerJoin(cards, eq(cardToWorkspaceMembers.cardId, cards.id))
    .innerJoin(lists, eq(cards.listId, lists.id))
    .innerJoin(boards, eq(lists.boardId, boards.id))
    .leftJoin(cardsToLabels, eq(cards.id, cardsToLabels.cardId))
    .leftJoin(labels, eq(cardsToLabels.labelId, labels.id))
    .where(
      and(
        eq(cardToWorkspaceMembers.workspaceMemberId, member.id),
        ...conditions,
      ),
    )
    .orderBy(desc(cards.updatedAt))
    .limit(args.limit + 1);

  const hasMore = rows.length > args.limit;
  const items = rows.slice(0, args.limit);
  const nextCursor =
    hasMore && items[items.length - 1]?.updatedAt
      ? items[items.length - 1]!.updatedAt!
      : undefined;

  const cardMap = new Map<
    string,
    {
      publicId: string;
      title: string;
      dueDate: Date | null;
      updatedAt: Date | null;
      boardPublicId: string;
      boardName: string;
      listPublicId: string;
      listName: string;
      labels: { name: string; colourCode: string | null }[];
    }
  >();

  for (const row of items) {
    if (!cardMap.has(row.publicId)) {
      cardMap.set(row.publicId, {
        publicId: row.publicId,
        title: row.title,
        dueDate: row.dueDate,
        updatedAt: row.updatedAt,
        boardPublicId: row.boardPublicId,
        boardName: row.boardName,
        listPublicId: row.listPublicId,
        listName: row.listName,
        labels: [],
      });
    }
    if (row.labelName) {
      cardMap.get(row.publicId)!.labels.push({
        name: row.labelName,
        colourCode: row.labelColourCode,
      });
    }
  }

  return {
    cards: Array.from(cardMap.values()),
    hasMore,
    nextCursor,
  };
};
