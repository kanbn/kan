import { and, asc, count, eq, gt, inArray, isNull, or } from "drizzle-orm";

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
    cursor?: Date; // createdAt cursor for pagination
  },
) => {
  const limit = options?.limit ?? 20;
  const cursor = options?.cursor;

  const topLevelComments = await db
    .select({ id: comments.id, publicId: comments.publicId })
    .from(comments)
    .where(
      and(
        eq(comments.cardId, cardId),
        isNull(comments.deletedAt),
        isNull(comments.parentCommentPublicId),
      ),
    );

  const topLevelCommentIds = topLevelComments.map((comment) => comment.id);

  const baseWhere = and(
    eq(cardActivities.cardId, cardId),
    cursor ? gt(cardActivities.createdAt, cursor) : undefined,
    topLevelCommentIds.length > 0
      ? or(
          isNull(cardActivities.commentId),
          inArray(cardActivities.commentId, topLevelCommentIds),
        )
      : isNull(cardActivities.commentId),
  );

  const baseActivities = await db.query.cardActivities.findMany({
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
    where: baseWhere,
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
          parentCommentPublicId: true,
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
    orderBy: asc(cardActivities.createdAt), // required for merging and pagination
    limit: limit + 1, // fetch one extra to check if there are more
  });

  const hasMore = baseActivities.length > limit;
  const baseItems = baseActivities.slice(0, limit);
  const nextCursor = hasMore
    ? baseItems[baseItems.length - 1]?.createdAt
    : undefined;

  const topLevelCommentPublicIdsInPage = baseItems
    .filter((activity) => activity.type === "card.updated.comment.added")
    .map((activity) => activity.comment?.publicId)
    .filter((publicId): publicId is string => !!publicId);

  const replyCommentIds: number[] = [];
  if (topLevelCommentPublicIdsInPage.length > 0) {
    let frontier = topLevelCommentPublicIdsInPage;
    const seen = new Set<string>(frontier);
    let depth = 0;

    while (frontier.length > 0 && depth < 10) {
      const children = await db
        .select({ id: comments.id, publicId: comments.publicId })
        .from(comments)
        .where(
          and(
            eq(comments.cardId, cardId),
            isNull(comments.deletedAt),
            inArray(comments.parentCommentPublicId, frontier),
          ),
        );

      const nextFrontier: string[] = [];
      for (const child of children) {
        replyCommentIds.push(child.id);
        if (!seen.has(child.publicId)) {
          seen.add(child.publicId);
          nextFrontier.push(child.publicId);
        }
      }

      frontier = nextFrontier;
      depth += 1;
    }
  }

  const replyActivities =
    replyCommentIds.length > 0
      ? await db.query.cardActivities.findMany({
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
            eq(cardActivities.type, "card.updated.comment.added"),
            inArray(cardActivities.commentId, replyCommentIds),
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
                parentCommentPublicId: true,
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
          orderBy: asc(cardActivities.createdAt),
        })
      : [];

  const activitiesByPublicId = new Map<string, (typeof baseItems)[number]>();
  for (const activity of baseItems) {
    activitiesByPublicId.set(activity.publicId, activity);
  }
  for (const activity of replyActivities) {
    activitiesByPublicId.set(activity.publicId, activity);
  }

  const mergedItems = Array.from(activitiesByPublicId.values()).sort((a, b) => {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return {
    activities: mergedItems,
    hasMore,
    nextCursor,
  };
};

export type PaginatedActivitiesResult = Awaited<
  ReturnType<typeof getPaginatedActivities>
>;
