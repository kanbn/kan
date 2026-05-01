import { and, count, desc, eq, isNull } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import type { NotificationType } from "@kan/db/schema";
import { notifications } from "@kan/db/schema";
import { generateUID } from "@kan/shared/utils";

export const create = async (
  db: dbClient,
  notificationInput: {
    type: NotificationType;
    userId: string;
    cardId?: number;
    commentId?: number;
    workspaceId?: number;
    metadata?: string;
  },
) => {
  const [result] = await db
    .insert(notifications)
    .values({
      publicId: generateUID(),
      type: notificationInput.type,
      userId: notificationInput.userId,
      cardId: notificationInput.cardId,
      commentId: notificationInput.commentId,
      workspaceId: notificationInput.workspaceId,
      metadata: notificationInput.metadata,
    })
    .returning();

  return result;
};

export const exists = async (
  db: dbClient,
  args: {
    userId: string;
    type: NotificationType;
    cardId?: number;
    workspaceId?: number;
    commentId?: number;
  },
) => {
  const result = await db.query.notifications.findFirst({
    where: (notifications, { eq, and, isNull: isNullFn }) => {
      const conditions = [
        eq(notifications.userId, args.userId),
        eq(notifications.type, args.type),
        isNullFn(notifications.deletedAt),
      ];

      if (args.cardId) {
        conditions.push(eq(notifications.cardId, args.cardId));
      }

      if (args.workspaceId) {
        conditions.push(eq(notifications.workspaceId, args.workspaceId));
      }

      return and(...conditions);
    },
  });

  return !!result;
};

export const markAsRead = async (
  db: dbClient,
  notificationId: number,
) => {
  const [result] = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(eq(notifications.id, notificationId))
    .returning();

  return result;
};

export const getUnreadCount = async (
  db: dbClient,
  userId: string,
) => {
  const result = await db
    .select({ count: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        isNull(notifications.readAt),
        isNull(notifications.deletedAt),
      ),
    );

  return result[0]?.count ?? 0;
};

export const list = async (
  db: dbClient,
  { userId, limit = 20, offset = 0 }: { userId: string; limit?: number; offset?: number },
) => {
  return db.query.notifications.findMany({
    where: (n, { eq, isNull: isNullFn, and: andFn }) =>
      andFn(eq(n.userId, userId), isNullFn(n.deletedAt)),
    orderBy: (n) => [desc(n.createdAt)],
    limit,
    offset,
    with: {
      card: { columns: { publicId: true, title: true } },
      workspace: { columns: { publicId: true, name: true } },
    },
  });
};

export const markReadByPublicId = async (
  db: dbClient,
  { publicId, userId }: { publicId: string; userId: string },
) => {
  const [result] = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.publicId, publicId),
        eq(notifications.userId, userId),
        isNull(notifications.deletedAt),
      ),
    )
    .returning();

  return result;
};

export const markAllRead = async (db: dbClient, userId: string) => {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.userId, userId),
        isNull(notifications.readAt),
        isNull(notifications.deletedAt),
      ),
    );
};

