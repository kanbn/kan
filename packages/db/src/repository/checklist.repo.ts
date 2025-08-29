import { and, desc, eq, isNull } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import { checklistItems, checklists } from "@kan/db/schema";
import { generateUID } from "@kan/shared/utils";
import { IntegerConfig } from "drizzle-orm/sqlite-core";

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
    itemValue: number;
    itemIdentity: string;
    quantity: number;
    wash: boolean;
    iron: boolean;
    createdBy: string;
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
        itemValue: checklistItemInput.itemValue.toPrecision(4),
        itemIdentity: checklistItemInput.itemIdentity,
        quantity: checklistItemInput.quantity,
        wash: checklistItemInput.wash,
        iron: checklistItemInput.iron,
        createdBy: checklistItemInput.createdBy,
        checklistId: checklistItemInput.checklistId,
        index: lastItem ? lastItem.index + 1 : 0,
        completed: false,
      })
      .returning({
        id: checklistItems.id,
        publicId: checklistItems.publicId,
        title: checklistItems.title,
        itemValue: checklistItems.itemValue,
        itemIdentity: checklistItems.itemIdentity,
        quantity: checklistItems.quantity,
        wash: checklistItems.wash,
        iron: checklistItems.iron,
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
  args: { id: number; 
    title?: string; 
    completed?: boolean;
    quantity?: number;
    iron?: boolean;
    wash?: boolean;
    },
) => {
  const [result] = await db
    .update(checklistItems)
    .set({
      ...(args.title !== undefined ? { title: args.title } : {}),
      ...(args.completed !== undefined ? { completed: args.completed } : {}),
      ...(args.iron !== undefined ? { iron: args.iron } : {}),
      ...(args.wash !== undefined ? { wash: args.wash } : {}),
      ...(args.quantity !== undefined ? { quantity: args.quantity } : {}),
      updatedAt: new Date(),
    })
    .where(eq(checklistItems.id, args.id))
    .returning({
      publicId: checklistItems.publicId,
      title: checklistItems.title,
      completed: checklistItems.completed,
      iron: checklistItems.iron,
      wash: checklistItems.wash,
      quantity: checklistItems.quantity,
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
