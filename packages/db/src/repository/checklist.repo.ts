import { and, desc, eq, isNull } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import { checklistItems, checklists } from "@kan/db/schema";
import { generateUID } from "@kan/shared/utils";

export const create = async (
  db: dbClient,
  checklistInput: {
    cardId: number;
    name: string;
    createdBy: string;
  },
) => {
  return db.transaction(async (tx) => {
    const card = await tx.query.checklists.findFirst({
      where: and(
        eq(checklists.cardId, checklistInput.cardId),
        isNull(checklists.deletedAt),
      ),
      orderBy: desc(checklists.index),
    });

    const [result] = await tx
      .insert(checklists)
      .values({
        publicId: generateUID(),
        name: checklistInput.name,
        createdBy: checklistInput.createdBy,
        cardId: checklistInput.cardId,
        index: card ? card.index + 1 : 0,
      })
      .returning({
        id: checklists.id,
        publicId: checklists.publicId,
        name: checklists.name,
      });

    return result;
  });
};

export const createItem = async (
  db: dbClient,
  checklistItemInput: {
    checklistId: number;
    title: string;
    createdBy: string;
    completed?: boolean;
  },
) => {
  return db.transaction(async (tx) => {
    const lastItem = await tx.query.checklistItems.findFirst({
      where: and(
        eq(checklistItems.checklistId, checklistItemInput.checklistId),
        isNull(checklistItems.deletedAt),
      ),
      orderBy: desc(checklistItems.index),
    });

    const [result] = await tx
      .insert(checklistItems)
      .values({
        publicId: generateUID(),
        title: checklistItemInput.title,
        createdBy: checklistItemInput.createdBy,
        checklistId: checklistItemInput.checklistId,
        index: lastItem ? lastItem.index + 1 : 0,
        completed: checklistItemInput.completed ?? false,
      })
      .returning({
        id: checklistItems.id,
        publicId: checklistItems.publicId,
        title: checklistItems.title,
        completed: checklistItems.completed,
      });

    return result;
  });
};

export const getChecklistByPublicId = async (
  db: dbClient,
  checklistPublicId: string,
) => {
  const checklist = await db.query.checklists.findFirst({
    where: and(
      eq(checklists.publicId, checklistPublicId),
      isNull(checklists.deletedAt),
    ),
    with: {
      card: {
        with: {
          list: {
            with: {
              board: {
                with: {
                  workspace: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return checklist;
};

export const getChecklistItemByPublicIdWithChecklist = async (
  db: dbClient,
  checklistItemPublicId: string,
) => {
  const item = await db.query.checklistItems.findFirst({
    where: and(
      eq(checklistItems.publicId, checklistItemPublicId),
      isNull(checklistItems.deletedAt),
    ),
    with: {
      checklist: {
        with: {
          card: {
            with: {
              list: {
                with: {
                  board: {
                    with: { workspace: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  return item;
};

export const updateItemById = async (
  db: dbClient,
  args: { id: number; title?: string; completed?: boolean },
) => {
  const [result] = await db
    .update(checklistItems)
    .set({
      ...(args.title !== undefined ? { title: args.title } : {}),
      ...(args.completed !== undefined ? { completed: args.completed } : {}),
      updatedAt: new Date(),
    })
    .where(eq(checklistItems.id, args.id))
    .returning({
      publicId: checklistItems.publicId,
      title: checklistItems.title,
      completed: checklistItems.completed,
    });

  return result;
};

export const softDeleteItemById = async (
  db: dbClient,
  args: { id: number; deletedAt: Date; deletedBy: string },
) => {
  const [result] = await db
    .update(checklistItems)
    .set({ deletedAt: args.deletedAt, deletedBy: args.deletedBy })
    .where(eq(checklistItems.id, args.id))
    .returning({ id: checklistItems.id });

  return result;
};

export const softDeleteAllItemsByChecklistId = async (
  db: dbClient,
  args: { checklistId: number; deletedAt: Date; deletedBy: string },
) => {
  const result = await db
    .update(checklistItems)
    .set({ deletedAt: args.deletedAt, deletedBy: args.deletedBy })
    .where(
      and(
        eq(checklistItems.checklistId, args.checklistId),
        isNull(checklistItems.deletedAt),
      ),
    )
    .returning({ id: checklistItems.id });

  return result;
};

export const softDeleteById = async (
  db: dbClient,
  args: { id: number; deletedAt: Date; deletedBy: string },
) => {
  const [result] = await db
    .update(checklists)
    .set({ deletedAt: args.deletedAt, deletedBy: args.deletedBy })
    .where(eq(checklists.id, args.id))
    .returning({ id: checklists.id });

  return result;
};

export const updateChecklistById = async (
  db: dbClient,
  args: { id: number; name: string },
) => {
  const [result] = await db
    .update(checklists)
    .set({ name: args.name, updatedAt: new Date() })
    .where(eq(checklists.id, args.id))
    .returning({ publicId: checklists.publicId, name: checklists.name });
  return result;
};

export const bulkCreate = async (
  db: dbClient,
  checklistInput: {
    cardId: number;
    name: string;
    createdBy: string;
    index: number;
  }[],
) => {
  if (checklistInput.length === 0) return [];

  return db.transaction(async (tx) => {
    const byCard = groupByKey(checklistInput, "cardId");

    const allValuesToInsert: {
      publicId: string;
      cardId: number;
      name: string;
      createdBy: string;
      index: number;
    }[] = [];

    for (const [cardId, items] of byCard.entries()) {
      const last = await tx.query.checklists.findFirst({
        columns: { index: true },
        where: and(eq(checklists.cardId, cardId), isNull(checklists.deletedAt)),
        orderBy: [desc(checklists.index)],
      });

      let nextIndex = last ? last.index + 1 : 0;

      const sorted = [...items].sort((a, b) => a.index - b.index);

      for (const item of sorted) {
        allValuesToInsert.push({
          publicId: generateUID(),
          ...item,
          index: nextIndex++,
        });
      }
    }

    const inserted = await tx
      .insert(checklists)
      .values(allValuesToInsert)
      .returning({ id: checklists.id, publicId: checklists.publicId });

    return inserted;
  });
};

export const bulkCreateItems = async (
  db: dbClient,
  checklistItemInput: {
    checklistId: number;
    title: string;
    createdBy: string;
    index: number;
    completed: boolean;
  }[],
) => {
  if (checklistItemInput.length === 0) return [];

  return db.transaction(async (tx) => {
    const byChecklist = groupByKey(checklistItemInput, "checklistId");

    const allValuesToInsert: {
      publicId: string;
      checklistId: number;
      title: string;
      createdBy: string;
      index: number;
      completed: boolean;
    }[] = [];

    for (const [checklistId, items] of byChecklist.entries()) {
      const last = await tx.query.checklistItems.findFirst({
        columns: { index: true },
        where: and(
          eq(checklistItems.checklistId, checklistId),
          isNull(checklistItems.deletedAt),
        ),
        orderBy: [desc(checklistItems.index)],
      });

      let nextIndex = last ? last.index + 1 : 0;

      const sorted = [...items].sort((a, b) => a.index - b.index);

      for (const item of sorted) {
        allValuesToInsert.push({
          publicId: generateUID(),
          ...item,
          index: nextIndex++,
        });
      }
    }

    const inserted = await tx
      .insert(checklistItems)
      .values(allValuesToInsert)
      .returning({
        id: checklistItems.id,
        publicId: checklistItems.publicId,
        title: checklistItems.title,
        completed: checklistItems.completed,
      });

    return inserted;
  });
};

const groupByKey = <T extends Record<string, unknown>>(
  items: T[],
  keyField: keyof T,
): Map<number, T[]> => {
  const grouped = new Map<number, T[]>();
  for (const item of items) {
    const key = item[keyField] as number;
    const arr = grouped.get(key) ?? [];
    arr.push(item);
    grouped.set(key, arr);
  }
  return grouped;
};
