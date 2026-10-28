import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  lt,
  or,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import type { dbClient } from "@kan/db/client";
import type { ActivityType } from "@kan/db/schema";
import { cardActivities, comments } from "@kan/db/schema";
import { generateUID } from "@kan/shared/utils";

export const getCount = async (db: dbClient) => {
  const result = await db.select({ count: count() }).from(cardActivities);

  return result[0]?.count ?? 0;
};

export const create = async (
  db: dbClient,
  activityInput: {
    type: ActivityType;
    cardId: number;
    fromIndex?: number;
    toIndex?: number;
    fromListId?: number;
    toListId?: number;
    labelId?: number;
    workspaceMemberId?: number;
    fromTitle?: string;
    toTitle?: string;
    fromDescription?: string;
    toDescription?: string;
    createdBy: string;
    commentId?: number;
    fromComment?: string;
    toComment?: string;
    fromDueDate?: Date;
    toDueDate?: Date;
    sourceBoardId?: number;
    attachmentId?: number;
  },
) => {
  const [result] = await db
    .insert(cardActivities)
    .values({
      publicId: generateUID(),
      type: activityInput.type,
      cardId: activityInput.cardId,
      fromListId: activityInput.fromListId,
      toListId: activityInput.toListId,
      fromIndex: activityInput.fromIndex,
      toIndex: activityInput.toIndex,
      labelId: activityInput.labelId,
      workspaceMemberId: activityInput.workspaceMemberId,
      fromTitle: activityInput.fromTitle,
      toTitle: activityInput.toTitle,
      fromDescription: activityInput.fromDescription,
      toDescription: activityInput.toDescription,
      createdBy: activityInput.createdBy,
      commentId: activityInput.commentId,
      fromComment: activityInput.fromComment,
      toComment: activityInput.toComment,
      fromDueDate: activityInput.fromDueDate,
      toDueDate: activityInput.toDueDate,
      sourceBoardId: activityInput.sourceBoardId,
      attachmentId: activityInput.attachmentId,
    })
    .returning({ id: cardActivities.id });

  return result;
};

export const bulkCreate = async (
  db: dbClient,
  activityInputs: {
    type: ActivityType;
    cardId: number;
    fromIndex?: number;
    toIndex?: number;
    fromListId?: number;
    toListId?: number;
    labelId?: number;
    workspaceMemberId?: number;
    fromTitle?: string;
    toTitle?: string;
    fromDescription?: string;
    toDescription?: string;
    createdBy: string;
    fromDueDate?: Date;
    toDueDate?: Date;
    sourceBoardId?: number;
    attachmentId?: number;
  }[],
) => {
  const activitiesWithPublicIds = activityInputs.map((activity) => ({
    ...activity,
    publicId: generateUID(),
  }));

  const results = await db
    .insert(cardActivities)
    .values(activitiesWithPublicIds)
    .returning({ id: cardActivities.id });

  return results;
};

export const getPaginatedActivities = async (
  db: dbClient,
  cardId: number,
  options?: {
    limit?: number;
    cursor?: {
      createdAt: Date;
      publicId?: string;
    };
    order?: "oldest" | "newest";
  },
) => {
  const limit = options?.limit ?? 20;
  const cursor = options?.cursor;
  const order = options?.order ?? "oldest";

  const validComments = await db
    .select({ id: comments.id })
    .from(comments)
    .where(and(eq(comments.cardId, cardId), isNull(comments.deletedAt)));

  const validCommentIds = validComments.map((comment) => comment.id);

  const cursorCondition = (() => {
    if (!cursor) return undefined;

    const cursorActivity = alias(cardActivities, "cursor_activity");
    const cursorTimestamp = cursor.publicId
      ? db
          .select({ createdAt: cursorActivity.createdAt })
          .from(cursorActivity)
          .where(
            and(
              eq(cursorActivity.publicId, cursor.publicId),
              eq(cursorActivity.cardId, cardId),
            ),
          )
          .limit(1)
      : cursor.createdAt;

    return order === "newest"
      ? cursor.publicId
        ? or(
            lt(cardActivities.createdAt, cursorTimestamp),
            and(
              eq(cardActivities.createdAt, cursorTimestamp),
              lt(cardActivities.publicId, cursor.publicId),
            ),
          )
        : lt(cardActivities.createdAt, cursor.createdAt)
      : cursor.publicId
        ? or(
            gt(cardActivities.createdAt, cursorTimestamp),
            and(
              eq(cardActivities.createdAt, cursorTimestamp),
              gt(cardActivities.publicId, cursor.publicId),
            ),
          )
        : gt(cardActivities.createdAt, cursor.createdAt);
  })();

  const activities = await db.query.cardActivities.findMany({
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
    where: and(
      eq(cardActivities.cardId, cardId),
      cursorCondition,
      or(
        isNull(cardActivities.commentId),
        inArray(cardActivities.commentId, validCommentIds),
      ),
    ),
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
              image: true,
            },
          },
        },
      },
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
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
      },
      attachment: {
        columns: {
          publicId: true,
          filename: true,
          originalFilename: true,
        },
      },
    },
    orderBy:
      order === "newest"
        ? [desc(cardActivities.createdAt), desc(cardActivities.publicId)]
        : [asc(cardActivities.createdAt), asc(cardActivities.publicId)],
    limit: limit + 1, // fetch one extra to check if there are more
  });

  const hasMore = activities.length > limit;
  const items = activities.slice(0, limit);
  const lastItem = hasMore ? items[items.length - 1] : undefined;
  const nextCursor = lastItem
    ? {
        createdAt: lastItem.createdAt,
        publicId: lastItem.publicId,
      }
    : undefined;

  return {
    activities: items,
    hasMore,
    nextCursor,
  };
};

export type PaginatedActivitiesResult = Awaited<
  ReturnType<typeof getPaginatedActivities>
>;
