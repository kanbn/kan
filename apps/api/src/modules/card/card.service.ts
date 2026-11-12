import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";

import * as cardRepo from "@kan/db/repository/card.repo";
import { CardLabelBoardError } from "@kan/db/repository/card.repo";
import * as cardActivityRepo from "@kan/db/repository/cardActivity.repo";
import * as cardCommentRepo from "@kan/db/repository/cardComment.repo";
import * as checklistRepo from "@kan/db/repository/checklist.repo";
import * as labelRepo from "@kan/db/repository/label.repo";
import * as listRepo from "@kan/db/repository/list.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { createLogger } from "@kan/logger";
import { mergeActivities } from "@kan/server/utils/activities";
import { createAvatarUrlResolver } from "@kan/server/utils/avatarUrls";
import { assertNoNewPausedMentions } from "@kan/server/utils/mention-permissions";
import { sendMentionEmails } from "@kan/server/utils/notifications";
import {
  assertBoardAccess,
  assertCanDelete,
  assertCanEdit,
  assertPermission,
  filterBoardAssignable,
} from "@kan/server/utils/permissions";
import {
  createCardWebhookPayload,
  sendWebhooksForWorkspace,
} from "@kan/server/utils/webhook";
import { generateAttachmentUrl, normalizeDescription } from "@kan/shared/utils";

import { db } from "../../common/session.util.js";
import { toJson } from "../../common/to-json.util.js";

const log = createLogger("card");

@Injectable()
export class CardService {
  async create(input: {
    title: string;
    description: string;
    listPublicId: string;
    labelPublicIds: string[];
    memberPublicIds: string[];
    position: "start" | "end";
    dueDate?: Date | null;
    userId: string;
    userName: string;
  }) {
    const { userId } = input;
    const list = await listRepo.getWorkspaceAndListIdByListPublicId(
      db,
      input.listPublicId,
    );

    if (!list)
      throw new NotFoundException(
        `List with public ID ${input.listPublicId} not found`,
      );

    await assertPermission(db, userId, list.workspaceId, "card:create");
    await assertBoardAccess(db, userId, {
      id: list.boardId,
      workspaceId: list.workspaceId,
      type: list.boardType,
    });

    // Resolved before the card is created: the labels must belong to the
    // board the card is being created on, and a rejection after cardRepo.create
    // would leave the card behind with a 500 for what is a client-correctable
    // input.
    const labelsToLink = input.labelPublicIds.length
      ? await labelRepo.getAllByPublicIds(db, input.labelPublicIds)
      : [];

    // Every requested label must resolve. Accepting a subset would create the
    // card holding fewer labels than asked for, and report success.
    const requestedLabelIds = [...new Set(input.labelPublicIds)];

    if (labelsToLink.length !== requestedLabelIds.length)
      throw new NotFoundException(
        `Labels with public IDs (${input.labelPublicIds.join(", ")}) not found`,
      );

    const labelsFromAnotherBoard = labelsToLink.filter(
      (label) => label.boardId !== list.boardId,
    );

    if (labelsFromAnotherBoard.length)
      throw new BadRequestException(
        `Labels belong to a different board than list ${input.listPublicId}`,
      );

    const members = input.memberPublicIds.length
      ? await workspaceRepo.getAllMembersByPublicIds(
          db,
          input.memberPublicIds,
          list.workspaceId,
        )
      : [];

    if (members.length !== new Set(input.memberPublicIds).size)
      throw new NotFoundException(
        `Members with public IDs (${input.memberPublicIds.join(", ")}) not found`,
      );

    const assignableMembers = await filterBoardAssignable(
      db,
      { id: list.boardId, type: list.boardType },
      members,
    );

    if (assignableMembers.length !== members.length)
      throw new BadRequestException(
        `Members must be on the board to be assigned`,
      );

    if (members.some((member) => member.status === "paused"))
      throw new BadRequestException(
        `Paused members cannot be assigned to cards`,
      );

    const description = normalizeDescription(input.description);
    await assertNoNewPausedMentions(
      db,
      list.workspaceId,
      null,
      description ?? "",
    );

    const newCard = await cardRepo.create(db, {
      title: input.title,
      description,
      createdBy: userId,
      listId: list.id,
      workspaceId: list.workspaceId,
      position: input.position,
      dueDate: input.dueDate ?? null,
    });

    const newCardId = newCard.id;

    if (!newCardId)
      throw new InternalServerErrorException(`Failed to create card`);

    if (newCardId && labelsToLink.length) {
      const labelsInsert = labelsToLink.map((label) => ({
        cardId: newCardId,
        labelId: label.id,
      }));

      const cardLabels = await cardRepo.bulkCreateCardLabelRelationships(
        db,
        labelsInsert,
      );

      if (!cardLabels.length)
        throw new InternalServerErrorException(
          `Failed to create card label relationships`,
        );

      const cardActivitesInsert = cardLabels.map((cardLabel) => ({
        type: "card.updated.label.added" as const,
        cardId: cardLabel.cardId,
        labelId: cardLabel.labelId,
        createdBy: userId,
      }));

      await cardActivityRepo.bulkCreate(db, cardActivitesInsert);
    }

    if (newCardId && members.length) {
      const membersInsert = members.map((member) => ({
        cardId: newCardId,
        workspaceMemberId: member.id,
      }));

      const cardMembers =
        await cardRepo.bulkCreateCardWorkspaceMemberRelationships(
          db,
          membersInsert,
        );

      if (!cardMembers.length)
        throw new InternalServerErrorException(
          `Failed to create card member relationships`,
        );

      const cardActivitesInsert = cardMembers.map((cardMember) => ({
        type: "card.updated.member.added" as const,
        cardId: cardMember.cardId,
        workspaceMemberId: cardMember.workspaceMemberId,
        createdBy: userId,
      }));

      await cardActivityRepo.bulkCreate(db, cardActivitesInsert);
    }

    if (input.description) {
      void sendMentionEmails({
        db: db,
        cardPublicId: newCard.publicId,
        previousHtml: null,
        nextHtml: input.description,
        commenterUserId: userId,
      });
    }

    // Fire webhooks (non-blocking)
    sendWebhooksForWorkspace(
      db,
      list.workspaceId,
      createCardWebhookPayload(
        "card.created",
        {
          id: String(newCard.id),
          publicId: newCard.publicId,
          title: input.title,
          description: input.description,
          dueDate: input.dueDate ?? null,
          listId: list.publicId,
        },
        {
          boardId: list.boardPublicId,
          boardName: list.boardName,
          listName: list.name,
          user: { id: userId, name: input.userName },
        },
      ),
    ).catch((error) => {
      log.error({ err: error }, "Webhook delivery failed");
    });

    return newCard;
  }

  async addComment(input: {
    cardPublicId: string;
    comment: string;
    userId: string;
  }) {
    const { userId } = input;
    const card = await cardRepo.getWorkspaceAndCardIdByCardPublicId(
      db,
      input.cardPublicId,
    );

    if (!card)
      throw new NotFoundException(
        `Card with public ID ${input.cardPublicId} not found`,
      );

    await assertPermission(db, userId, card.workspaceId, "comment:create");
    await assertBoardAccess(db, userId, {
      id: card.boardId,
      workspaceId: card.workspaceId,
      type: card.boardType,
    });

    await assertNoNewPausedMentions(db, card.workspaceId, null, input.comment);

    const newComment = await cardCommentRepo.create(db, {
      comment: input.comment,
      createdBy: userId,
      cardId: card.id,
    });

    if (!newComment?.id)
      throw new InternalServerErrorException(`Failed to create comment`);

    await cardActivityRepo.create(db, {
      type: "card.updated.comment.added" as const,
      cardId: card.id,
      commentId: newComment.id,
      toComment: newComment.comment,
      createdBy: userId,
    });

    void sendMentionEmails({
      db: db,
      cardPublicId: input.cardPublicId,
      previousHtml: null,
      nextHtml: input.comment,
      commenterUserId: userId,
      commentId: newComment.id,
    });

    return newComment;
  }

  async updateComment(input: {
    cardPublicId: string;
    commentPublicId: string;
    comment: string;
    userId: string;
  }) {
    const { userId } = input;
    const card = await cardRepo.getWorkspaceAndCardIdByCardPublicId(
      db,
      input.cardPublicId,
    );

    if (!card)
      throw new NotFoundException(
        `Card with public ID ${input.cardPublicId} not found`,
      );

    const existingComment = await cardCommentRepo.getByPublicId(
      db,
      input.commentPublicId,
    );

    if (!existingComment || existingComment.cardId !== card.id)
      throw new NotFoundException(
        `Comment with public ID ${input.commentPublicId} not found`,
      );

    await assertCanEdit(
      db,
      userId,
      card.workspaceId,
      "comment:edit",
      existingComment.createdBy,
    );
    await assertBoardAccess(db, userId, {
      id: card.boardId,
      workspaceId: card.workspaceId,
      type: card.boardType,
    });

    await assertNoNewPausedMentions(
      db,
      card.workspaceId,
      existingComment.comment,
      input.comment,
    );

    const updatedComment = await cardCommentRepo.update(db, {
      id: existingComment.id,
      comment: input.comment,
    });

    if (!updatedComment?.id)
      throw new InternalServerErrorException(`Failed to update comment`);

    await cardActivityRepo.create(db, {
      type: "card.updated.comment.updated" as const,
      cardId: card.id,
      commentId: updatedComment.id,
      fromComment: existingComment.comment,
      toComment: updatedComment.comment,
      createdBy: userId,
    });

    void sendMentionEmails({
      db: db,
      cardPublicId: input.cardPublicId,
      previousHtml: existingComment.comment,
      nextHtml: input.comment,
      commenterUserId: userId,
      commentId: updatedComment.id,
    });

    return updatedComment;
  }

  async deleteComment(input: {
    cardPublicId: string;
    commentPublicId: string;
    userId: string;
  }) {
    const { userId } = input;
    const card = await cardRepo.getWorkspaceAndCardIdByCardPublicId(
      db,
      input.cardPublicId,
    );

    if (!card)
      throw new NotFoundException(
        `Card with public ID ${input.cardPublicId} not found`,
      );

    const existingComment = await cardCommentRepo.getByPublicId(
      db,
      input.commentPublicId,
    );

    if (!existingComment || existingComment.cardId !== card.id)
      throw new NotFoundException(
        `Comment with public ID ${input.commentPublicId} not found`,
      );

    await assertCanDelete(
      db,
      userId,
      card.workspaceId,
      "comment:delete",
      existingComment.createdBy,
    );
    await assertBoardAccess(db, userId, {
      id: card.boardId,
      workspaceId: card.workspaceId,
      type: card.boardType,
    });

    const deletedComment = await cardCommentRepo.softDelete(db, {
      commentId: existingComment.id,
      deletedAt: new Date(),
      deletedBy: userId,
    });

    if (!deletedComment)
      throw new InternalServerErrorException(`Failed to delete comment`);

    await cardActivityRepo.create(db, {
      type: "card.updated.comment.deleted" as const,
      cardId: card.id,
      commentId: existingComment.id,
      createdBy: userId,
    });

    return { publicId: input.commentPublicId };
  }

  async addOrRemoveLabel(input: {
    cardPublicId: string;
    labelPublicId: string;
    userId: string;
  }) {
    const { userId } = input;
    const card = await cardRepo.getWorkspaceAndCardIdByCardPublicId(
      db,
      input.cardPublicId,
    );

    if (!card)
      throw new NotFoundException(
        `Card with public ID ${input.cardPublicId} not found`,
      );

    await assertPermission(db, userId, card.workspaceId, "card:edit");
    await assertBoardAccess(db, userId, {
      id: card.boardId,
      workspaceId: card.workspaceId,
      type: card.boardType,
    });

    const label = await labelRepo.getByPublicId(db, input.labelPublicId);

    if (!label)
      throw new NotFoundException(
        `Label with public ID ${input.labelPublicId} not found`,
      );

    const cardLabelIds = { cardId: card.id, labelId: label.id };

    const existingLabel = await cardRepo.getCardLabelRelationship(
      db,
      cardLabelIds,
    );

    if (existingLabel) {
      const deletedCardLabelRelationship =
        await cardRepo.hardDeleteCardLabelRelationship(db, cardLabelIds);

      if (!deletedCardLabelRelationship)
        throw new InternalServerErrorException(
          `Failed to remove label from card`,
        );

      await cardActivityRepo.create(db, {
        type: "card.updated.label.removed" as const,
        cardId: card.id,
        labelId: label.id,
        createdBy: userId,
      });

      return { newLabel: false };
    }

    // The public add-label path reaches the writer without pre-validating, so
    // it maps the domain error rather than surfacing a 500 for what is a
    // client-correctable input. A middleware could do this once for every
    // transport, but that changes the error path for every procedure and
    // belongs with the wider decision, not in a bug fix.
    const newCardLabelRelationship = await cardRepo
      .createCardLabelRelationship(db, cardLabelIds)
      .catch((error: unknown) => {
        if (error instanceof CardLabelBoardError)
          throw error.violation === "board_mismatch"
            ? new BadRequestException(error.message)
            : new NotFoundException(error.message);
        throw error;
      });

    if (!newCardLabelRelationship)
      throw new InternalServerErrorException(`Failed to add label to card`);

    await cardActivityRepo.create(db, {
      type: "card.updated.label.added" as const,
      cardId: card.id,
      labelId: label.id,
      createdBy: userId,
    });

    return { newLabel: true };
  }

  async addOrRemoveMember(input: {
    cardPublicId: string;
    workspaceMemberPublicId: string;
    userId: string;
  }) {
    const { userId } = input;
    const card = await cardRepo.getWorkspaceAndCardIdByCardPublicId(
      db,
      input.cardPublicId,
    );

    if (!card)
      throw new NotFoundException(
        `Card with public ID ${input.cardPublicId} not found`,
      );

    await assertPermission(db, userId, card.workspaceId, "card:edit");
    await assertBoardAccess(db, userId, {
      id: card.boardId,
      workspaceId: card.workspaceId,
      type: card.boardType,
    });

    const member = await workspaceRepo.getMemberByPublicId(
      db,
      input.workspaceMemberPublicId,
      card.workspaceId,
    );

    if (!member)
      throw new NotFoundException(
        `Member with public ID ${input.workspaceMemberPublicId} not found`,
      );

    const cardMemberIds = { cardId: card.id, memberId: member.id };

    const existingMember = await cardRepo.getCardMemberRelationship(
      db,
      cardMemberIds,
    );

    if (existingMember) {
      const deletedCardMemberRelationship =
        await cardRepo.hardDeleteCardMemberRelationship(db, cardMemberIds);

      if (!deletedCardMemberRelationship.success)
        throw new InternalServerErrorException(
          `Failed to remove member from card`,
        );

      await cardActivityRepo.create(db, {
        type: "card.updated.member.removed" as const,
        cardId: card.id,
        workspaceMemberId: member.id,
        createdBy: userId,
      });

      return { newMember: false };
    }

    // Only assign people who can see the board.
    const [assignable] = await filterBoardAssignable(
      db,
      { id: card.boardId, type: card.boardType },
      [member],
    );

    if (!assignable)
      throw new BadRequestException(`Member is not on this board`);

    if (member.status === "paused")
      throw new BadRequestException(
        `Paused members cannot be assigned to cards`,
      );

    const newCardMemberRelationship =
      await cardRepo.createCardMemberRelationship(db, cardMemberIds);

    if (!newCardMemberRelationship.success)
      throw new InternalServerErrorException(`Failed to add member to card`);

    await cardActivityRepo.create(db, {
      type: "card.updated.member.added" as const,
      cardId: card.id,
      workspaceMemberId: member.id,
      createdBy: userId,
    });

    return { newMember: true };
  }

  async byId(input: { cardPublicId: string; userId?: string }) {
    const card = await cardRepo.getWorkspaceAndCardIdByCardPublicId(
      db,
      input.cardPublicId,
    );

    if (!card)
      throw new NotFoundException(
        `Card with public ID ${input.cardPublicId} not found`,
      );

    if (card.workspaceVisibility === "private") {
      const userId = input.userId;

      if (!userId) throw new UnauthorizedException(`User not authenticated`);

      await assertPermission(db, userId, card.workspaceId, "card:view");
      await assertBoardAccess(db, userId, {
        id: card.boardId,
        workspaceId: card.workspaceId,
        type: card.boardType,
      });
    }

    const result = await cardRepo.getWithListAndMembersByPublicId(
      db,
      input.cardPublicId,
    );

    if (!result)
      throw new NotFoundException(
        `Card with public ID ${input.cardPublicId} not found`,
      );

    // Generate URLs for all attachments
    const attachmentsWithUrls = await Promise.all(
      result.attachments.map(async (attachment) => {
        const url = await generateAttachmentUrl(attachment.s3Key);
        return {
          publicId: attachment.publicId,
          contentType: attachment.contentType,
          s3Key: attachment.s3Key,
          originalFilename: attachment.originalFilename,
          size: attachment.size,
          url,
        };
      }),
    );

    // Generate presigned URLs for workspace member avatars
    const resolveAvatarUrl = createAvatarUrlResolver();
    const workspaceWithAvatarUrls = {
      ...result.list.board.workspace,
      // Only offer people who belong on this board as assignees/mentions.
      members: await Promise.all(
        (
          await filterBoardAssignable(
            db,
            { id: card.boardId, type: card.boardType },
            result.list.board.workspace.members,
          )
        ).map(async (member) => {
          if (!member.user?.image) {
            return member;
          }

          const avatarUrl = await resolveAvatarUrl(member.user.image);
          return {
            ...member,
            user: {
              ...member.user,
              image: avatarUrl,
            },
          };
        }),
      ),
    };

    return toJson({
      ...result,
      attachments: attachmentsWithUrls,
      list: {
        ...result.list,
        board: {
          ...result.list.board,
          workspace: workspaceWithAvatarUrls,
        },
      },
    });
  }

  async getActivities(input: {
    cardPublicId: string;
    limit: number;
    cursor?: string;
    cursorPublicId?: string;
    order: "oldest" | "newest";
    userId?: string;
  }) {
    const card = await cardRepo.getWorkspaceAndCardIdByCardPublicId(
      db,
      input.cardPublicId,
    );

    if (!card)
      throw new NotFoundException(
        `Card with public ID ${input.cardPublicId} not found`,
      );

    if (card.workspaceVisibility === "private") {
      const userId = input.userId;

      if (!userId) throw new UnauthorizedException(`User not authenticated`);

      await assertPermission(db, userId, card.workspaceId, "card:view");
      await assertBoardAccess(db, userId, {
        id: card.boardId,
        workspaceId: card.workspaceId,
        type: card.boardType,
      });
    }

    const cursor = input.cursor
      ? {
          createdAt: new Date(input.cursor),
          publicId: input.cursorPublicId,
        }
      : undefined;
    const result = await cardActivityRepo.getPaginatedActivities(db, card.id, {
      limit: input.limit,
      cursor,
      order: input.order,
    });

    // Generate presigned URLs for user avatars in activities
    const resolveAvatarUrl = createAvatarUrlResolver();
    const activitiesWithAvatarUrls = await Promise.all(
      result.activities.map(async (activity) => {
        const updatedActivity = { ...activity };

        // Generate presigned URL for activity user avatar
        if (activity.user?.image) {
          const userAvatarUrl = await resolveAvatarUrl(activity.user.image);
          updatedActivity.user = {
            ...activity.user,
            image: userAvatarUrl,
          };
        }

        // Generate presigned URL for member user avatar (if exists)
        if (activity.member?.user?.image) {
          const memberAvatarUrl = await resolveAvatarUrl(
            activity.member.user.image,
          );
          updatedActivity.member = {
            ...activity.member,
            user: {
              ...activity.member.user,
              image: memberAvatarUrl,
            },
          };
        }

        return updatedActivity;
      }),
    );

    const chronologicalActivities =
      input.order === "newest"
        ? [...activitiesWithAvatarUrls].reverse()
        : activitiesWithAvatarUrls;
    const mergedActivities = mergeActivities(chronologicalActivities);
    const orderedActivities =
      input.order === "newest"
        ? [...mergedActivities].reverse()
        : mergedActivities;

    return toJson({
      activities: orderedActivities,
      hasMore: result.hasMore,
      nextCursor: result.nextCursor?.createdAt.toISOString() ?? null,
      nextCursorPublicId: result.nextCursor?.publicId ?? null,
    });
  }

  async update(input: {
    cardPublicId: string;
    title?: string;
    description?: string;
    index?: number;
    listPublicId?: string;
    dueDate?: Date | null;
    userId: string;
    userName: string;
  }) {
    const { userId } = input;
    const card = await cardRepo.getWorkspaceAndCardIdByCardPublicId(
      db,
      input.cardPublicId,
    );

    if (!card)
      throw new NotFoundException(
        `Card with public ID ${input.cardPublicId} not found`,
      );

    await assertCanEdit(
      db,
      userId,
      card.workspaceId,
      "card:edit",
      card.createdBy,
    );
    await assertBoardAccess(db, userId, {
      id: card.boardId,
      workspaceId: card.workspaceId,
      type: card.boardType,
    });

    const existingCard = await cardRepo.getByPublicId(db, input.cardPublicId);

    let newListId: number | undefined;
    let newList:
      | {
          id: number;
          publicId: string;
          name: string;
          boardId: number;
          index: number;
          workspaceId: number;
          boardType: string;
        }
      | undefined;

    if (input.listPublicId) {
      newList = await listRepo.getByPublicId(db, input.listPublicId);

      if (!newList)
        throw new NotFoundException(
          `List with public ID ${input.listPublicId} not found`,
        );

      if (newList.workspaceId !== card.workspaceId)
        throw new BadRequestException(
          `Target list must be in the same workspace`,
        );

      await assertBoardAccess(db, userId, {
        id: newList.boardId,
        workspaceId: newList.workspaceId,
        type: newList.boardType,
      });

      newListId = newList.id;
    }

    if (!existingCard) {
      throw new NotFoundException(
        `Card with public ID ${input.cardPublicId} not found`,
      );
    }

    let result:
      | {
          id: number;
          title: string;
          description: string | null;
          publicId: string;
          dueDate: Date | null;
        }
      | undefined;

    const previousDueDate = existingCard.dueDate;
    const normalizedDescription =
      input.description !== undefined
        ? normalizeDescription(input.description)
        : undefined;
    const descriptionChanged =
      normalizedDescription !== undefined &&
      existingCard.description !== normalizedDescription;

    if (descriptionChanged)
      await assertNoNewPausedMentions(
        db,
        card.workspaceId,
        existingCard.description,
        normalizedDescription ?? "",
      );

    if (
      input.title ||
      normalizedDescription !== undefined ||
      input.dueDate !== undefined
    ) {
      result = await cardRepo.update(
        db,
        {
          ...(input.title && { title: input.title }),
          ...(normalizedDescription !== undefined && {
            description: normalizedDescription,
          }),
          ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
        },
        { cardPublicId: input.cardPublicId },
      );
    }

    if (input.index !== undefined || newListId !== undefined) {
      result = await cardRepo.reorder(db, {
        cardId: existingCard.id,
        newIndex: input.index,
        newListId: newListId,
      });
    }

    if (!result)
      throw new InternalServerErrorException(`Failed to update card`);

    const activities = [];

    if (input.title && existingCard.title !== input.title) {
      activities.push({
        type: "card.updated.title" as const,
        cardId: result.id,
        createdBy: userId,
        fromTitle: existingCard.title,
        toTitle: input.title,
      });
    }

    if (descriptionChanged) {
      activities.push({
        type: "card.updated.description" as const,
        cardId: result.id,
        createdBy: userId,
        fromDescription: existingCard.description ?? undefined,
        toDescription: normalizedDescription ?? undefined,
      });

      if (normalizedDescription) {
        void sendMentionEmails({
          db: db,
          cardPublicId: input.cardPublicId,
          previousHtml: existingCard.description,
          nextHtml: normalizedDescription,
          commenterUserId: userId,
        });
      }
    }

    if (
      input.dueDate !== undefined &&
      previousDueDate?.getTime() !== input.dueDate?.getTime()
    ) {
      let activityType:
        | "card.updated.dueDate.added"
        | "card.updated.dueDate.updated"
        | "card.updated.dueDate.removed";

      if (!previousDueDate) {
        activityType = "card.updated.dueDate.added";
      } else if (!input.dueDate) {
        activityType = "card.updated.dueDate.removed";
      } else {
        activityType = "card.updated.dueDate.updated";
      }

      activities.push({
        type: activityType,
        cardId: result.id,
        createdBy: userId,
        fromDueDate: previousDueDate ?? undefined,
        toDueDate: input.dueDate ?? undefined,
      });
    }

    if (newListId && existingCard.listId !== newListId) {
      activities.push({
        type: "card.updated.list" as const,
        cardId: result.id,
        createdBy: userId,
        fromListId: existingCard.listId,
        toListId: newListId,
      });
    }

    // Moving to another board unassigns anyone who isn't on that board.
    if (newList && newList.boardId !== card.boardId) {
      const assignees = await cardRepo.getAssignees(db, card.id);
      const keep = new Set(
        (
          await filterBoardAssignable(
            db,
            { id: newList.boardId, type: newList.boardType },
            assignees,
          )
        ).map((member) => member.id),
      );

      for (const member of assignees.filter((m) => !keep.has(m.id))) {
        await cardRepo.hardDeleteCardMemberRelationship(db, {
          cardId: card.id,
          memberId: member.id,
        });
        activities.push({
          type: "card.updated.member.removed" as const,
          cardId: card.id,
          workspaceMemberId: member.id,
          createdBy: userId,
        });
      }
    }

    if (activities.length > 0) {
      await cardActivityRepo.bulkCreate(db, activities);
    }

    // Build changes object for webhook
    const webhookChanges: Record<string, { from: unknown; to: unknown }> = {};
    if (input.title && existingCard.title !== input.title) {
      webhookChanges.title = { from: existingCard.title, to: input.title };
    }
    if (descriptionChanged) {
      webhookChanges.description = {
        from: existingCard.description,
        to: normalizedDescription,
      };
    }
    if (
      input.dueDate !== undefined &&
      previousDueDate?.getTime() !== input.dueDate?.getTime()
    ) {
      webhookChanges.dueDate = { from: previousDueDate, to: input.dueDate };
    }
    // newList is set exactly when listPublicId was given and resolved.
    const movedToList =
      newList && existingCard.listId !== newList.id ? newList : undefined;
    const movedToNewList = Boolean(movedToList);
    const currentWebhookListPublicId =
      movedToList?.publicId ?? existingCard.list.publicId;
    const currentWebhookListName = movedToList?.name ?? existingCard.list.name;

    if (movedToList) {
      webhookChanges.listId = {
        from: existingCard.list.publicId,
        to: movedToList.publicId,
      };
    }

    // Fire webhooks (non-blocking)
    sendWebhooksForWorkspace(
      db,
      card.workspaceId,
      createCardWebhookPayload(
        movedToNewList ? "card.moved" : "card.updated",
        {
          id: String(result.id),
          publicId: result.publicId,
          title: result.title,
          description: result.description,
          dueDate: result.dueDate,
          listId: currentWebhookListPublicId,
        },
        {
          boardId: card.boardPublicId,
          boardName: card.boardName,
          listName: currentWebhookListName,
          user: { id: userId, name: input.userName },
          changes:
            Object.keys(webhookChanges).length > 0 ? webhookChanges : undefined,
        },
      ),
    ).catch((error) => {
      log.error({ err: error }, "Webhook delivery failed");
    });

    return toJson(result);
  }

  async delete(input: {
    cardPublicId: string;
    userId: string;
    userName: string;
  }) {
    const { userId } = input;
    const card = await cardRepo.getWorkspaceAndCardIdByCardPublicId(
      db,
      input.cardPublicId,
    );

    if (!card)
      throw new NotFoundException(
        `Card with public ID ${input.cardPublicId} not found`,
      );

    await assertCanDelete(
      db,
      userId,
      card.workspaceId,
      "card:delete",
      card.createdBy,
    );
    await assertBoardAccess(db, userId, {
      id: card.boardId,
      workspaceId: card.workspaceId,
      type: card.boardType,
    });

    // Fetch full card data before delete for webhook
    const fullCard = await cardRepo.getByPublicId(db, input.cardPublicId);

    const deletedAt = new Date();

    await cardRepo.softDelete(db, {
      cardId: card.id,
      deletedAt,
      deletedBy: userId,
    });

    await cardActivityRepo.create(db, {
      type: "card.archived",
      cardId: card.id,
      createdBy: userId,
    });

    // Fire webhooks (non-blocking)
    if (fullCard) {
      sendWebhooksForWorkspace(
        db,
        card.workspaceId,
        createCardWebhookPayload(
          "card.deleted",
          {
            id: String(fullCard.id),
            publicId: fullCard.publicId,
            title: fullCard.title,
            description: fullCard.description,
            dueDate: fullCard.dueDate,
            listId: fullCard.list.publicId,
          },
          {
            boardId: card.boardPublicId,
            boardName: card.boardName,
            listName: fullCard.list.name,
            user: { id: userId, name: input.userName },
          },
        ),
      ).catch((error) => {
        log.error({ err: error }, "Webhook delivery failed");
      });
    }

    return { success: true };
  }

  async duplicate(input: {
    cardPublicId: string;
    listPublicId: string;
    index?: number;
    title?: string;
    copyLabels: boolean;
    copyMembers: boolean;
    copyChecklists: boolean;
    userId: string;
  }) {
    const { userId } = input;
    const sourceCardMeta = await cardRepo.getWorkspaceAndCardIdByCardPublicId(
      db,
      input.cardPublicId,
    );

    if (!sourceCardMeta)
      throw new NotFoundException(
        `Card with public ID ${input.cardPublicId} not found`,
      );

    await assertPermission(
      db,
      userId,
      sourceCardMeta.workspaceId,
      "card:create",
    );
    await assertBoardAccess(db, userId, {
      id: sourceCardMeta.boardId,
      workspaceId: sourceCardMeta.workspaceId,
      type: sourceCardMeta.boardType,
    });

    const targetList = await listRepo.getWorkspaceAndListIdByListPublicId(
      db,
      input.listPublicId,
    );

    if (!targetList)
      throw new NotFoundException(
        `List with public ID ${input.listPublicId} not found`,
      );

    if (targetList.workspaceId !== sourceCardMeta.workspaceId)
      throw new BadRequestException(
        `Target list must be in the same workspace`,
      );

    await assertBoardAccess(db, userId, {
      id: targetList.boardId,
      workspaceId: targetList.workspaceId,
      type: targetList.boardType,
    });

    const sourceCard = await cardRepo.getWithListAndMembersByPublicId(
      db,
      input.cardPublicId,
    );

    if (!sourceCard)
      throw new NotFoundException(
        `Card with public ID ${input.cardPublicId} not found`,
      );

    // Checked before the card exists. cardRepo.create opens its own
    // transaction, so the router cannot roll it back: a refusal after this
    // point leaves a duplicate behind, and the caller retrying as the error
    // message suggests would make a second one.
    const sourceLabels = sourceCard.labels;
    const sourceLabelRecords =
      input.copyLabels && sourceLabels.length
        ? await labelRepo.getAllByPublicIds(
            db,
            sourceLabels.map((label) => label.publicId),
          )
        : [];

    if (
      sourceLabelRecords.some((label) => label.boardId !== targetList.boardId)
    )
      throw new BadRequestException(
        `Cannot copy labels to a list on a different board. Labels belong to a board, so duplicate with copyLabels: false when the target list is on another board.`,
      );

    const newCard = await cardRepo.create(db, {
      title: input.title ?? sourceCard.title,
      description: normalizeDescription(sourceCard.description),
      createdBy: userId,
      listId: targetList.id,
      workspaceId: targetList.workspaceId,
      position: "end",
      dueDate: sourceCard.dueDate ?? null,
    });

    if (input.index !== undefined && input.index >= 0) {
      await cardRepo.reorder(db, {
        cardId: newCard.id,
        newIndex: input.index,
        newListId: targetList.id,
      });
    }

    if (input.copyLabels && sourceLabelRecords.length) {
      const labels = sourceLabelRecords;
      if (labels.length) {
        const labelsInsert = labels.map((label) => ({
          cardId: newCard.id,
          labelId: label.id,
        }));
        await cardRepo.bulkCreateCardLabelRelationships(db, labelsInsert);
        const cardActivitesInsert = labels.map((cardLabel) => ({
          type: "card.updated.label.added" as const,
          cardId: newCard.id,
          labelId: cardLabel.id,
          createdBy: userId,
        }));
        await cardActivityRepo.bulkCreate(db, cardActivitesInsert);
      }
    }

    if (input.copyMembers && sourceCard.members.length) {
      const memberPublicIds = sourceCard.members.map((m) => m.publicId);
      // Drop anyone who isn't on the target board (e.g. copying a card
      // from a board they're on to one they aren't).
      const members = await filterBoardAssignable(
        db,
        { id: targetList.boardId, type: targetList.boardType },
        (
          await workspaceRepo.getAllMembersByPublicIds(
            db,
            memberPublicIds,
            sourceCardMeta.workspaceId,
          )
        ).filter((member) => member.status !== "paused"),
      );
      if (members.length) {
        const membersInsert = members.map((member) => ({
          cardId: newCard.id,
          workspaceMemberId: member.id,
        }));
        await cardRepo.bulkCreateCardWorkspaceMemberRelationships(
          db,
          membersInsert,
        );
        const cardActivitesInsert = members.map((member) => ({
          type: "card.updated.member.added" as const,
          cardId: newCard.id,
          workspaceMemberId: member.id,
          createdBy: userId,
        }));
        await cardActivityRepo.bulkCreate(db, cardActivitesInsert);
      }
    }

    if (input.copyChecklists && sourceCard.checklists.length) {
      for (const checklist of sourceCard.checklists) {
        const newChecklist = await checklistRepo.create(db, {
          cardId: newCard.id,
          name: checklist.name,
          createdBy: userId,
        });
        if (!newChecklist?.id) continue;
        if (checklist.items.length) {
          for (const item of checklist.items) {
            await checklistRepo.createItem(db, {
              checklistId: newChecklist.id,
              title: item.title,
              createdBy: userId,
              completed: false,
            });
          }
        }
        await cardActivityRepo.create(db, {
          type: "card.updated.checklist.added",
          cardId: newCard.id,
          toTitle: newChecklist.name,
          createdBy: userId,
        });
      }
    }

    return { publicId: newCard.publicId };
  }
}
