import type { dbClient } from "@kan/db/client";
import type { ActivityType } from "@kan/db/schema";
import { cardActivities } from "@kan/db/schema";
import { generateUID } from "@kan/shared/utils";

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
