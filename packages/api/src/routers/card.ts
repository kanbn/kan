import { TRPCError } from "@trpc/server";
import { z } from "zod";

import * as cardRepo from "@banana/db/repository/card.repo";
import * as cardActivityRepo from "@banana/db/repository/cardActivity.repo";
import * as cardCommentRepo from "@banana/db/repository/cardComment.repo";
import * as checklistRepo from "@banana/db/repository/checklist.repo";
import * as labelRepo from "@banana/db/repository/label.repo";
import * as listRepo from "@banana/db/repository/list.repo";
import * as workspaceRepo from "@banana/db/repository/workspace.repo";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import {
  cardCreateResponseSchema,
  cardUpdateResponseSchema,
  cardDetailSchema,
  commentResponseSchema,
  commentDeleteResponseSchema,
  activityItemSchema,
} from "../schemas";
import { mergeActivities } from "../utils/activities";
import {
  sendAssignmentPush,
  sendCardMembersPush,
  sendMentionEmails,
  sendUnassignmentPush,
} from "../utils/notifications";
import {
  getCommenterEmails,
  notifyBlockerCompleted,
  sendMattermostNotification,
} from "../utils/mattermost";
import { assertCanDelete, assertCanEdit, assertPermission } from "../utils/permissions";
import { generateAttachmentUrl, generateAvatarUrl } from "@banana/shared/utils";
import {
  createCardWebhookPayload,
  sendWebhooksForWorkspace,
} from "../utils/webhook";

export const cardRouter = createTRPCRouter({
  calendar: protectedProcedure
    .input(
      z.object({
        workspacePublicId: z.string().min(12),
        boardPublicId: z.string().min(12).optional(),
        month: z.number().int().min(0).max(11),
        year: z.number().int().min(2020),
      }),
    )
    .output(
      z.array(
        z.object({
          publicId: z.string(),
          title: z.string(),
          dueDate: z.date().nullable(),
          boardPublicId: z.string(),
          boardName: z.string(),
          labels: z.array(
            z.object({
              name: z.string(),
              colourCode: z.string().nullable(),
            }),
          ),
        }),
      ),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      if (!userId)
        throw new TRPCError({ message: "User not authenticated", code: "UNAUTHORIZED" });

      const workspace = await workspaceRepo.getByPublicId(ctx.db, input.workspacePublicId);
      if (!workspace)
        throw new TRPCError({ message: "Workspace not found", code: "NOT_FOUND" });

      await assertPermission(ctx.db, userId, workspace.id, "card:view");

      const startDate = new Date(input.year, input.month, 1);
      const endDate = new Date(input.year, input.month + 1, 0, 23, 59, 59, 999);

      let boardId: number | undefined;
      if (input.boardPublicId) {
        const board = await ctx.db.query.boards.findFirst({
          columns: { id: true },
          where: (b, { eq }) => eq(b.publicId, input.boardPublicId!),
        });
        boardId = board?.id;
      }

      return cardRepo.getCalendarCards(ctx.db, {
        workspaceId: workspace.id,
        boardId,
        startDate,
        endDate,
      });
    }),
  create: protectedProcedure
    .meta({
      openapi: {
        summary: "Create a card",
        method: "POST",
        path: "/cards",
        description: "Creates a new card for a given list",
        tags: ["Cards"],
        protect: true,
      },
    })
    .input(
      z.object({
        title: z.string().min(1).max(2000),
        description: z.string().max(10000),
        listPublicId: z.string().min(12),
        labelPublicIds: z.array(z.string().min(12)),
        memberPublicIds: z.array(z.string().min(12)),
        position: z.enum(["start", "end"]),
        dueDate: z.date().nullable().optional(),
        checklists: z.array(z.object({
          name: z.string().min(1).max(255),
          items: z.array(z.string().min(1).max(500)),
        })).optional().default([]),
      }),
    )
    .output(cardCreateResponseSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const list = await listRepo.getWorkspaceAndListIdByListPublicId(
        ctx.db,
        input.listPublicId,
      );

      if (!list)
        throw new TRPCError({
          message: `List with public ID ${input.listPublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertPermission(ctx.db, userId, list.workspaceId, "card:create");

      const newCard = await cardRepo.create(ctx.db, {
        title: input.title,
        description: input.description,
        createdBy: userId,
        listId: list.id,
        workspaceId: list.workspaceId,
        position: input.position,
        dueDate: input.dueDate ?? null,
      });

      const newCardId = newCard.id;

      if (!newCardId)
        throw new TRPCError({
          message: `Failed to create card`,
          code: "INTERNAL_SERVER_ERROR",
        });

      if (newCardId && input.labelPublicIds.length) {
        const labels = await labelRepo.getAllByPublicIds(
          ctx.db,
          input.labelPublicIds,
        );

        if (!labels.length)
          throw new TRPCError({
            message: `Labels with public IDs (${input.labelPublicIds.join(", ")}) not found`,
            code: "NOT_FOUND",
          });

        const labelsInsert = labels.map((label) => ({
          cardId: newCardId,
          labelId: label.id,
        }));

        const cardLabels = await cardRepo.bulkCreateCardLabelRelationships(
          ctx.db,
          labelsInsert,
        );

        if (!cardLabels.length)
          throw new TRPCError({
            message: `Failed to create card label relationships`,
            code: "INTERNAL_SERVER_ERROR",
          });

        const cardActivitesInsert = cardLabels.map((cardLabel) => ({
          type: "card.updated.label.added" as const,
          cardId: cardLabel.cardId,
          labelId: cardLabel.labelId,
          createdBy: userId,
        }));

        await cardActivityRepo.bulkCreate(ctx.db, cardActivitesInsert);
      }

      if (newCardId && input.memberPublicIds.length) {
        const members = await workspaceRepo.getAllMembersByPublicIds(
          ctx.db,
          input.memberPublicIds,
        );

        if (!members.length)
          throw new TRPCError({
            message: `Members with public IDs (${input.memberPublicIds.join(", ")}) not found`,
            code: "NOT_FOUND",
          });

        const membersInsert = members.map((member) => ({
          cardId: newCardId,
          workspaceMemberId: member.id,
        }));

        const cardMembers =
          await cardRepo.bulkCreateCardWorkspaceMemberRelationships(
            ctx.db,
            membersInsert,
          );

        if (!cardMembers.length)
          throw new TRPCError({
            message: `Failed to create card member relationships`,
            code: "INTERNAL_SERVER_ERROR",
          });

        const cardActivitesInsert = cardMembers.map((cardMember) => ({
          type: "card.updated.member.added" as const,
          cardId: cardMember.cardId,
          workspaceMemberId: cardMember.workspaceMemberId,
          createdBy: userId,
        }));

        await cardActivityRepo.bulkCreate(ctx.db, cardActivitesInsert);

        // Notify each assigned member via Mattermost
        sendMattermostNotification(
          ctx.db,
          newCardId,
          newCard.publicId,
          userId,
          ctx.user?.name ?? "Someone",
          "assigned you to",
        ).catch((error) => {
          console.error("Failed to send Mattermost notification:", error);
        });

        // Also push to any subscribed device of each assigned member.
        void sendAssignmentPush(ctx.db, {
          cardPublicId: newCard.publicId,
          actorUserId: userId,
          actorName: ctx.user?.name ?? "Someone",
          workspaceMemberIds: members.map((m) => m.id),
        });
      }

      if (input.checklists.length > 0) {
        for (const cl of input.checklists) {
          const checklist = await checklistRepo.create(ctx.db, {
            cardId: newCardId,
            name: cl.name,
            createdBy: userId,
          });

          if (checklist && cl.items.length > 0) {
            await checklistRepo.bulkCreateItems(
              ctx.db,
              cl.items.map((title, i) => ({
                checklistId: checklist.id,
                title,
                createdBy: userId,
                index: i,
                completed: false,
              })),
            );
          }

          await cardActivityRepo.create(ctx.db, {
            type: "card.updated.checklist.added",
            cardId: newCardId,
            toTitle: cl.name,
            createdBy: userId,
          });
        }
      }

      if (input.description) {
        sendMentionEmails({
          db: ctx.db,
          cardPublicId: newCard.publicId,
          commentHtml: input.description,
          commenterUserId: userId,
        }).catch((error) => {
          console.error("Failed to send mention emails:", error);
        });
      }

      // Fire webhooks (non-blocking)
      sendWebhooksForWorkspace(
        ctx.db,
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
            user: ctx.user
              ? { id: ctx.user.id, name: ctx.user.name }
              : undefined,
          },
        ),
      ).catch((error) => {
        console.error("Webhook delivery failed:", error);
      });

      return newCard;
    }),
  addComment: protectedProcedure
    .meta({
      openapi: {
        summary: "Add a comment to a card",
        method: "POST",
        path: "/cards/{cardPublicId}/comments",
        description: "Adds a comment to a card",
        tags: ["Cards"],
        protect: true,
      },
    })
    .input(
      z.object({
        cardPublicId: z.string().min(12),
        comment: z.string().min(1),
      }),
    )
    .output(commentResponseSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const card = await cardRepo.getWorkspaceAndCardIdByCardPublicId(
        ctx.db,
        input.cardPublicId,
      );

      if (!card)
        throw new TRPCError({
          message: `Card with public ID ${input.cardPublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertPermission(ctx.db, userId, card.workspaceId, "comment:create");

      const newComment = await cardCommentRepo.create(ctx.db, {
        comment: input.comment,
        createdBy: userId,
        cardId: card.id,
      });

      if (!newComment?.id)
        throw new TRPCError({
          message: `Failed to create comment`,
          code: "INTERNAL_SERVER_ERROR",
        });

      await cardActivityRepo.create(ctx.db, {
        type: "card.updated.comment.added" as const,
        cardId: card.id,
        commentId: newComment.id,
        toComment: newComment.comment,
        createdBy: userId,
      });

      sendMentionEmails({
        db: ctx.db,
        cardPublicId: input.cardPublicId,
        commentHtml: input.comment,
        commenterUserId: userId,
        commentId: newComment.id,
      }).catch((error) => {
        console.error("Failed to send mention emails:", error);
      });

      // Fetch past commenters so they also get notified
      const commenterEmails = await getCommenterEmails(
        ctx.db,
        card.id,
        userId,
      ).catch(() => [] as string[]);

      sendMattermostNotification(
        ctx.db,
        card.id,
        input.cardPublicId,
        userId,
        ctx.user?.name ?? "Someone",
        "commented",
        undefined,
        undefined,
        commenterEmails,
      ).catch((error) => {
        console.error("Failed to send Mattermost notification:", error);
      });

      return newComment;
    }),
  updateComment: protectedProcedure
    .meta({
      openapi: {
        summary: "Update a comment",
        method: "PUT",
        path: "/cards/{cardPublicId}/comments/{commentPublicId}",
        description: "Updates a comment",
        tags: ["Cards"],
        protect: true,
      },
    })
    .input(
      z.object({
        cardPublicId: z.string().min(12),
        commentPublicId: z.string().min(12),
        comment: z.string().min(1),
      }),
    )
    .output(commentResponseSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const card = await cardRepo.getWorkspaceAndCardIdByCardPublicId(
        ctx.db,
        input.cardPublicId,
      );

      if (!card)
        throw new TRPCError({
          message: `Card with public ID ${input.cardPublicId} not found`,
          code: "NOT_FOUND",
        });

      const existingComment = await cardCommentRepo.getByPublicId(
        ctx.db,
        input.commentPublicId,
      );

      if (!existingComment)
        throw new TRPCError({
          message: `Comment with public ID ${input.commentPublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertCanEdit(
        ctx.db,
        userId,
        card.workspaceId,
        "comment:edit",
        existingComment.createdBy,
      );

      const updatedComment = await cardCommentRepo.update(ctx.db, {
        id: existingComment.id,
        comment: input.comment,
      });

      if (!updatedComment?.id)
        throw new TRPCError({
          message: `Failed to update comment`,
          code: "INTERNAL_SERVER_ERROR",
        });

      await cardActivityRepo.create(ctx.db, {
        type: "card.updated.comment.updated" as const,
        cardId: card.id,
        commentId: updatedComment.id,
        fromComment: existingComment.comment,
        toComment: updatedComment.comment,
        createdBy: userId,
      });

      sendMentionEmails({
        db: ctx.db,
        cardPublicId: input.cardPublicId,
        commentHtml: input.comment,
        commenterUserId: userId,
        commentId: updatedComment.id,
      }).catch((error) => {
        console.error("Failed to send mention emails:", error);
      });

      return updatedComment;
    }),
  deleteComment: protectedProcedure
    .meta({
      openapi: {
        summary: "Delete a comment",
        method: "DELETE",
        path: "/cards/{cardPublicId}/comments/{commentPublicId}",
        description: "Deletes a comment",
        tags: ["Cards"],
      },
    })
    .input(
      z.object({
        cardPublicId: z.string().min(12),
        commentPublicId: z.string().min(12),
      }),
    )
    .output(commentDeleteResponseSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const card = await cardRepo.getWorkspaceAndCardIdByCardPublicId(
        ctx.db,
        input.cardPublicId,
      );

      if (!card)
        throw new TRPCError({
          message: `Card with public ID ${input.cardPublicId} not found`,
          code: "NOT_FOUND",
        });

      const existingComment = await cardCommentRepo.getByPublicId(
        ctx.db,
        input.commentPublicId,
      );

      if (!existingComment)
        throw new TRPCError({
          message: `Comment with public ID ${input.commentPublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertCanDelete(
        ctx.db,
        userId,
        card.workspaceId,
        "comment:delete",
        existingComment.createdBy,
      );

      const deletedComment = await cardCommentRepo.softDelete(ctx.db, {
        commentId: existingComment.id,
        deletedAt: new Date(),
        deletedBy: userId,
      });

      if (!deletedComment)
        throw new TRPCError({
          message: `Failed to delete comment`,
          code: "INTERNAL_SERVER_ERROR",
        });

      await cardActivityRepo.create(ctx.db, {
        type: "card.updated.comment.deleted" as const,
        cardId: card.id,
        commentId: existingComment.id,
        createdBy: userId,
      });

      return { publicId: input.commentPublicId };
    }),
  addOrRemoveLabel: protectedProcedure
    .meta({
      openapi: {
        summary: "Add or remove a label from a card",
        method: "PUT",
        path: "/cards/{cardPublicId}/labels/{labelPublicId}",
        description: "Adds or removes a label from a card",
        tags: ["Cards"],
        protect: true,
      },
    })
    .input(
      z.object({
        cardPublicId: z.string().min(12),
        labelPublicId: z.string().min(12),
      }),
    )
    .output(z.object({ newLabel: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const card = await cardRepo.getWorkspaceAndCardIdByCardPublicId(
        ctx.db,
        input.cardPublicId,
      );

      if (!card)
        throw new TRPCError({
          message: `Card with public ID ${input.cardPublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertPermission(ctx.db, userId, card.workspaceId, "card:edit");

      const label = await labelRepo.getByPublicId(ctx.db, input.labelPublicId);

      if (!label)
        throw new TRPCError({
          message: `Label with public ID ${input.labelPublicId} not found`,
          code: "NOT_FOUND",
        });

      const cardLabelIds = { cardId: card.id, labelId: label.id };

      const existingLabel = await cardRepo.getCardLabelRelationship(
        ctx.db,
        cardLabelIds,
      );

      if (existingLabel) {
        const deletedCardLabelRelationship =
          await cardRepo.hardDeleteCardLabelRelationship(ctx.db, cardLabelIds);

        if (!deletedCardLabelRelationship)
          throw new TRPCError({
            message: `Failed to remove label from card`,
            code: "INTERNAL_SERVER_ERROR",
          });

        await cardActivityRepo.create(ctx.db, {
          type: "card.updated.label.removed" as const,
          cardId: card.id,
          labelId: label.id,
          createdBy: userId,
        });

        return { newLabel: false };
      }

      const newCardLabelRelationship =
        await cardRepo.createCardLabelRelationship(ctx.db, cardLabelIds);

      if (!newCardLabelRelationship)
        throw new TRPCError({
          message: `Failed to add label to card`,
          code: "INTERNAL_SERVER_ERROR",
        });

      await cardActivityRepo.create(ctx.db, {
        type: "card.updated.label.added" as const,
        cardId: card.id,
        labelId: label.id,
        createdBy: userId,
      });

      return { newLabel: true };
    }),
  addOrRemoveMember: protectedProcedure
    .meta({
      openapi: {
        summary: "Add or remove a member from a card",
        method: "PUT",
        path: "/cards/{cardPublicId}/members/{workspaceMemberPublicId}",
        description: "Adds or removes a member from a card",
        tags: ["Cards"],
      },
    })
    .input(
      z.object({
        cardPublicId: z.string().min(12),
        workspaceMemberPublicId: z.string().min(12),
      }),
    )
    .output(z.object({ newMember: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const card = await cardRepo.getWorkspaceAndCardIdByCardPublicId(
        ctx.db,
        input.cardPublicId,
      );

      if (!card)
        throw new TRPCError({
          message: `Card with public ID ${input.cardPublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertPermission(ctx.db, userId, card.workspaceId, "card:edit");

      const member = await workspaceRepo.getMemberByPublicId(
        ctx.db,
        input.workspaceMemberPublicId,
      );

      if (!member)
        throw new TRPCError({
          message: `Member with public ID ${input.workspaceMemberPublicId} not found`,
          code: "NOT_FOUND",
        });

      const cardMemberIds = { cardId: card.id, memberId: member.id };

      const existingMember = await cardRepo.getCardMemberRelationship(
        ctx.db,
        cardMemberIds,
      );

      if (existingMember) {
        const deletedCardMemberRelationship =
          await cardRepo.hardDeleteCardMemberRelationship(
            ctx.db,
            cardMemberIds,
          );

        if (!deletedCardMemberRelationship.success)
          throw new TRPCError({
            message: `Failed to remove member from card`,
            code: "INTERNAL_SERVER_ERROR",
          });

        await cardActivityRepo.create(ctx.db, {
          type: "card.updated.member.removed" as const,
          cardId: card.id,
          workspaceMemberId: member.id,
          createdBy: userId,
        });

        // Notify the removed member on their subscribed devices.
        void sendUnassignmentPush(ctx.db, {
          cardPublicId: input.cardPublicId,
          actorUserId: userId,
          actorName: ctx.user?.name ?? "Someone",
          workspaceMemberId: member.id,
        });

        return { newMember: false };
      }

      const newCardMemberRelationship =
        await cardRepo.createCardMemberRelationship(ctx.db, cardMemberIds);

      if (!newCardMemberRelationship.success)
        throw new TRPCError({
          message: `Failed to add member to card`,
          code: "INTERNAL_SERVER_ERROR",
        });

      await cardActivityRepo.create(ctx.db, {
        type: "card.updated.member.added" as const,
        cardId: card.id,
        workspaceMemberId: member.id,
        createdBy: userId,
      });

      sendMattermostNotification(
        ctx.db,
        card.id,
        input.cardPublicId,
        userId,
        ctx.user?.name ?? "Someone",
        "assigned you to",
        undefined,
        member.email ?? undefined,
      ).catch((error) => {
        console.error("Failed to send Mattermost notification:", error);
      });

      // Also push to the assigned member's subscribed devices.
      void sendAssignmentPush(ctx.db, {
        cardPublicId: input.cardPublicId,
        actorUserId: userId,
        actorName: ctx.user?.name ?? "Someone",
        workspaceMemberIds: [member.id],
      });

      return { newMember: true };
    }),
  byId: publicProcedure
    .meta({
      openapi: {
        summary: "Get a card by public ID",
        method: "GET",
        path: "/cards/{cardPublicId}",
        description: "Retrieves a card by its public ID",
        tags: ["Cards"],
      },
    })
    .input(z.object({ cardPublicId: z.string().min(12) }))
    .output(cardDetailSchema)
    .query(async ({ ctx, input }) => {
      const card = await cardRepo.getWorkspaceAndCardIdByCardPublicId(
        ctx.db,
        input.cardPublicId,
      );

      if (!card)
        throw new TRPCError({
          message: `Card with public ID ${input.cardPublicId} not found`,
          code: "NOT_FOUND",
        });

      if (card.workspaceVisibility === "private") {
        const userId = ctx.user?.id;

        if (!userId)
          throw new TRPCError({
            message: `User not authenticated`,
            code: "UNAUTHORIZED",
          });

        await assertPermission(ctx.db, userId, card.workspaceId, "card:view");
      }

      const result = await cardRepo.getWithListAndMembersByPublicId(
        ctx.db,
        input.cardPublicId,
      );

      if (!result)
        throw new TRPCError({
          message: `Card with public ID ${input.cardPublicId} not found`,
          code: "NOT_FOUND",
        });

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
      const workspaceWithAvatarUrls = result.list.board.workspace
        ? {
            ...result.list.board.workspace,
            members: await Promise.all(
              result.list.board.workspace.members.map(async (member) => {
                if (!member.user?.image) {
                  return member;
                }

                const avatarUrl = await generateAvatarUrl(member.user.image);
                return {
                  ...member,
                  user: {
                    ...member.user,
                    image: avatarUrl,
                  },
                };
              }),
            ),
          }
        : result.list.board.workspace;

      return {
        ...result,
        attachments: attachmentsWithUrls,
        list: {
          ...result.list,
          board: {
            ...result.list.board,
            workspace: workspaceWithAvatarUrls,
          },
        },
      };
    }),
  getActivities: publicProcedure
    .meta({
      openapi: {
        summary: "Get paginated card activities",
        method: "GET",
        path: "/cards/{cardPublicId}/activities",
        description:
          "Retrieves paginated activities for a card with merged frequent changes",
        tags: ["Cards"],
      },
    })
    .input(
      z.object({
        cardPublicId: z.string().min(12),
        limit: z.number().min(1).max(100).optional().default(10),
        cursor: z.string().datetime().optional(), // ISO datetime string
      }),
    )
    .output(
      z.object({
        activities: z.array(activityItemSchema),
        hasMore: z.boolean(),
        nextCursor: z.string().datetime().nullable(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const card = await cardRepo.getWorkspaceAndCardIdByCardPublicId(
        ctx.db,
        input.cardPublicId,
      );

      if (!card)
        throw new TRPCError({
          message: `Card with public ID ${input.cardPublicId} not found`,
          code: "NOT_FOUND",
        });

      if (card.workspaceVisibility === "private") {
        const userId = ctx.user?.id;

        if (!userId)
          throw new TRPCError({
            message: `User not authenticated`,
            code: "UNAUTHORIZED",
          });

        await assertPermission(ctx.db, userId, card.workspaceId, "card:view");
      }

      const cursor = input.cursor ? new Date(input.cursor) : undefined;
      const result = await cardActivityRepo.getPaginatedActivities(
        ctx.db,
        card.id,
        {
          limit: input.limit,
          cursor,
        },
      );

      // Generate presigned URLs for user avatars in activities
      const activitiesWithAvatarUrls = await Promise.all(
        result.activities.map(async (activity) => {
          const updatedActivity = { ...activity };

          // Generate presigned URL for activity user avatar
          if (activity.user?.image) {
            const userAvatarUrl = await generateAvatarUrl(activity.user.image);
            updatedActivity.user = {
              ...activity.user,
              image: userAvatarUrl,
            };
          }

          // Generate presigned URL for member user avatar (if exists)
          if (activity.member?.user?.image) {
            const memberAvatarUrl = await generateAvatarUrl(
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

      const mergedActivities = mergeActivities(activitiesWithAvatarUrls);

      return {
        activities: mergedActivities,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor?.toISOString() ?? null,
      };
    }),
  update: protectedProcedure
    .meta({
      openapi: {
        summary: "Update a card",
        method: "PUT",
        path: "/cards/{cardPublicId}",
        description: "Updates a card by its public ID",
        tags: ["Cards"],
        protect: true,
      },
    })
    .input(
      z.object({
        cardPublicId: z.string().min(12),
        title: z.string().min(1).max(2000).optional(),
        description: z.string().optional(),
        index: z.number().optional(),
        listPublicId: z.string().min(12).optional(),
        dueDate: z.date().nullable().optional(),
        isDone: z.boolean().optional(),
      }),
    )
    .output(cardUpdateResponseSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const card = await cardRepo.getWorkspaceAndCardIdByCardPublicId(
        ctx.db,
        input.cardPublicId,
      );

      if (!card)
        throw new TRPCError({
          message: `Card with public ID ${input.cardPublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertCanEdit(
        ctx.db,
        userId,
        card.workspaceId,
        "card:edit",
        card.createdBy,
      );

      const existingCard = await cardRepo.getByPublicId(
        ctx.db,
        input.cardPublicId,
      );

      let newListId: number | undefined;
      let newList:
        | {
            id: number;
            publicId: string;
            name: string;
            boardId: number;
            index: number;
          }
        | undefined;

      if (input.listPublicId) {
        newList = await listRepo.getByPublicId(
          ctx.db,
          input.listPublicId,
        );

        if (!newList)
          throw new TRPCError({
            message: `List with public ID ${input.listPublicId} not found`,
            code: "NOT_FOUND",
          });

        newListId = newList.id;
      }

      if (!existingCard) {
        throw new TRPCError({
          message: `Card with public ID ${input.cardPublicId} not found`,
          code: "NOT_FOUND",
        });
      }

      let result:
        | {
            id: number;
            title: string;
            description: string | null;
            publicId: string;
            dueDate: Date | null;
            isDone: boolean;
          }
        | undefined;

      const previousDueDate = existingCard.dueDate;

      if (
        input.title ||
        input.description ||
        input.dueDate !== undefined ||
        input.isDone !== undefined
      ) {
        result = await cardRepo.update(
          ctx.db,
          {
            ...(input.title && { title: input.title }),
            ...(input.description && { description: input.description }),
            ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
            ...(input.isDone !== undefined && { isDone: input.isDone }),
          },
          { cardPublicId: input.cardPublicId },
        );
      }

      if (input.index !== undefined || newListId !== undefined) {
        const reordered = await cardRepo.reorder(ctx.db, {
          cardId: existingCard.id,
          newIndex: input.index,
          newListId: newListId,
        });
        result = {
          ...(reordered as {
            id: number;
            title: string;
            description: string | null;
            publicId: string;
            dueDate: Date | null;
          }),
          isDone: result?.isDone ?? existingCard.isDone ?? false,
        };
      }

      // When a card is marked done without an explicit position/list change,
      // sink it to the bottom of its current list so completed work collects
      // at the end.
      if (
        input.isDone === true &&
        input.index === undefined &&
        !input.listPublicId
      ) {
        const reordered = await cardRepo.reorder(ctx.db, {
          cardId: existingCard.id,
          newListId: existingCard.listId,
          newIndex: undefined,
        });
        result = {
          ...(reordered as {
            id: number;
            title: string;
            description: string | null;
            publicId: string;
            dueDate: Date | null;
          }),
          isDone: result?.isDone ?? true,
        };
      }

      if (!result)
        throw new TRPCError({
          message: `Failed to update card`,
          code: "INTERNAL_SERVER_ERROR",
        });

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

      if (input.description && existingCard.description !== input.description) {
        activities.push({
          type: "card.updated.description" as const,
          cardId: result.id,
          createdBy: userId,
          fromDescription: existingCard.description ?? undefined,
          toDescription: input.description,
        });

        sendMentionEmails({
          db: ctx.db,
          cardPublicId: input.cardPublicId,
          commentHtml: input.description,
          commenterUserId: userId,
        }).catch((error) => {
          console.error("Failed to send mention emails:", error);
        });

        // Notify the card's current members about the description change.
        // Independent of @mentions above; removed members are excluded
        // (hard-deleted) and the actor is skipped.
        void sendCardMembersPush(ctx.db, {
          cardId: result.id,
          cardPublicId: input.cardPublicId,
          actorUserId: userId,
          actorName: ctx.user?.name ?? "Someone",
          action: "updated the description",
        });
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

      if (activities.length > 0) {
        await cardActivityRepo.bulkCreate(ctx.db, activities);
      }

      // Build changes object for webhook
      const webhookChanges: Record<string, { from: unknown; to: unknown }> = {};
      if (input.title && existingCard.title !== input.title) {
        webhookChanges.title = { from: existingCard.title, to: input.title };
      }
      if (input.description && existingCard.description !== input.description) {
        webhookChanges.description = {
          from: existingCard.description,
          to: input.description,
        };
      }
      if (
        input.dueDate !== undefined &&
        previousDueDate?.getTime() !== input.dueDate?.getTime()
      ) {
        webhookChanges.dueDate = { from: previousDueDate, to: input.dueDate };
      }
      const movedToNewList = Boolean(newListId && existingCard.listId !== newListId);
      const currentWebhookListPublicId = movedToNewList
        ? input.listPublicId!
        : existingCard.list.publicId;
      const currentWebhookListName = movedToNewList
        ? newList?.name ?? card.listName
        : existingCard.list.name;

      if (movedToNewList) {
        webhookChanges.listId = {
          from: existingCard.list.publicId,
          to: input.listPublicId!,
        };
      }

      // Fire webhooks (non-blocking)
      sendWebhooksForWorkspace(
        ctx.db,
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
            user: ctx.user
              ? { id: ctx.user.id, name: ctx.user.name }
              : undefined,
            changes:
              Object.keys(webhookChanges).length > 0
                ? webhookChanges
                : undefined,
          },
        ),
      ).catch((error) => {
        console.error("Webhook delivery failed:", error);
      });

      // Determine notification action text
      let mmAction: string | undefined;
      if (movedToNewList) {
        mmAction = `moved from **${existingCard.list.name}** to **${newList?.name}**`;
      } else if (input.title && existingCard.title !== input.title) {
        mmAction = "renamed the card";
      } else if (input.dueDate !== undefined && previousDueDate?.getTime() !== input.dueDate?.getTime()) {
        mmAction = !previousDueDate ? "set a due date on" : input.dueDate ? "updated the due date of" : "removed the due date from";
      } else if (input.description && existingCard.description !== input.description) {
        mmAction = "updated the description of";
      }

      if (mmAction) {
        sendMattermostNotification(
          ctx.db,
          result.id,
          input.cardPublicId,
          userId,
          ctx.user?.name ?? "Someone",
          mmAction,
        ).catch((error) => {
          console.error("Failed to send Mattermost notification:", error);
        });
      }

      // When a card that blocks other cards is marked done, notify the members
      // of those blocked cards via Mattermost so they know the work is unblocked.
      if (input.isDone === true && !existingCard.isDone) {
        notifyBlockerCompleted(ctx.db, {
          blockerCardId: result.id,
          blockerCardPublicId: input.cardPublicId,
          blockerTitle: result.title,
          actorUserId: userId,
          actorName: ctx.user?.name ?? "Someone",
        }).catch((error) => {
          console.error("Failed to send blocker-done notification:", error);
        });
      }

      return result;
    }),
  delete: protectedProcedure
    .meta({
      openapi: {
        summary: "Delete a card",
        method: "DELETE",
        path: "/cards/{cardPublicId}",
        description: "Deletes a card by its public ID",
        tags: ["Cards"],
        protect: true,
      },
    })
    .input(
      z.object({
        cardPublicId: z.string().min(12),
      }),
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const card = await cardRepo.getWorkspaceAndCardIdByCardPublicId(
        ctx.db,
        input.cardPublicId,
      );

      if (!card)
        throw new TRPCError({
          message: `Card with public ID ${input.cardPublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertCanDelete(
        ctx.db,
        userId,
        card.workspaceId,
        "card:delete",
        card.createdBy,
      );

      // Fetch full card data before delete for webhook
      const fullCard = await cardRepo.getByPublicId(ctx.db, input.cardPublicId);

      const deletedAt = new Date();

      await cardRepo.softDelete(ctx.db, {
        cardId: card.id,
        deletedAt,
        deletedBy: userId,
      });

      await cardActivityRepo.create(ctx.db, {
        type: "card.archived",
        cardId: card.id,
        createdBy: userId,
      });

      // Fire webhooks (non-blocking)
      if (fullCard) {
        sendWebhooksForWorkspace(
          ctx.db,
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
              user: ctx.user
                ? { id: ctx.user.id, name: ctx.user.name }
                : undefined,
            },
          ),
        ).catch((error) => {
          console.error("Webhook delivery failed:", error);
        });
      }

      sendMattermostNotification(
        ctx.db,
        card.id,
        input.cardPublicId,
        userId,
        ctx.user?.name ?? "Someone",
        "archived",
      ).catch((error) => {
        console.error("Failed to send Mattermost notification:", error);
      });

      return { success: true };
    }),
  duplicate: protectedProcedure
    .meta({
      openapi: {
        summary: "Duplicate a card",
        method: "POST",
        path: "/cards/{cardPublicId}/duplicate",
        description: "Duplicates a card to a target list with optional options",
        tags: ["Cards"],
        protect: true,
      },
    })
    .input(
      z.object({
        cardPublicId: z.string().min(12),
        listPublicId: z.string().min(12),
        index: z.number().int().min(0).optional(),
        title: z.string().min(1).max(2000).optional(),
        copyLabels: z.boolean(),
        copyMembers: z.boolean(),
        copyChecklists: z.boolean(),
      }),
    )
    .output(
      z.object({
        publicId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const sourceCardMeta = await cardRepo.getWorkspaceAndCardIdByCardPublicId(
        ctx.db,
        input.cardPublicId,
      );

      if (!sourceCardMeta)
        throw new TRPCError({
          message: `Card with public ID ${input.cardPublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertPermission(
        ctx.db,
        userId,
        sourceCardMeta.workspaceId,
        "card:create",
      );

      const targetList = await listRepo.getWorkspaceAndListIdByListPublicId(
        ctx.db,
        input.listPublicId,
      );

      if (!targetList)
        throw new TRPCError({
          message: `List with public ID ${input.listPublicId} not found`,
          code: "NOT_FOUND",
        });

      if (targetList.workspaceId !== sourceCardMeta.workspaceId)
        throw new TRPCError({
          message: `Target list must be in the same workspace`,
          code: "BAD_REQUEST",
        });

      const sourceCard = await cardRepo.getWithListAndMembersByPublicId(
        ctx.db,
        input.cardPublicId,
      );

      if (!sourceCard)
        throw new TRPCError({
          message: `Card with public ID ${input.cardPublicId} not found`,
          code: "NOT_FOUND",
        });

      const newCard = await cardRepo.create(ctx.db, {
        title: input.title ?? sourceCard.title,
        description: sourceCard.description ?? "",
        createdBy: userId,
        listId: targetList.id,
        workspaceId: targetList.workspaceId,
        position: "end",
        dueDate: sourceCard.dueDate ?? null,
      });

      if (input.index !== undefined && input.index >= 0) {
        await cardRepo.reorder(ctx.db, {
          cardId: newCard.id,
          newIndex: input.index,
          newListId: targetList.id,
        });
      }

      if (input.copyLabels && sourceCard.labels?.length) {
        const labelPublicIds = sourceCard.labels.map((l) => l.publicId);
        const labels = await labelRepo.getAllByPublicIds(ctx.db, labelPublicIds);
        if (labels.length) {
          const labelsInsert = labels.map((label) => ({
            cardId: newCard.id,
            labelId: label.id,
          }));
          await cardRepo.bulkCreateCardLabelRelationships(ctx.db, labelsInsert);
          const cardActivitesInsert = labels.map((cardLabel) => ({
            type: "card.updated.label.added" as const,
            cardId: newCard.id,
            labelId: cardLabel.id,
            createdBy: userId,
          }));
          await cardActivityRepo.bulkCreate(ctx.db, cardActivitesInsert);
        }
      }

      if (input.copyMembers && sourceCard.members?.length) {
        const memberPublicIds = sourceCard.members.map((m) => m.publicId);
        const members = await workspaceRepo.getAllMembersByPublicIds(
          ctx.db,
          memberPublicIds,
        );
        if (members.length) {
          const membersInsert = members.map((member) => ({
            cardId: newCard.id,
            workspaceMemberId: member.id,
          }));
          await cardRepo.bulkCreateCardWorkspaceMemberRelationships(
            ctx.db,
            membersInsert,
          );
          const cardActivitesInsert = members.map((member) => ({
            type: "card.updated.member.added" as const,
            cardId: newCard.id,
            workspaceMemberId: member.id,
            createdBy: userId,
          }));
          await cardActivityRepo.bulkCreate(ctx.db, cardActivitesInsert);
        }
      }

      if (input.copyChecklists && sourceCard.checklists?.length) {
        for (const checklist of sourceCard.checklists) {
          const newChecklist = await checklistRepo.create(ctx.db, {
            cardId: newCard.id,
            name: checklist.name,
            createdBy: userId,
          });
          if (!newChecklist?.id) continue;
          if (checklist.items?.length) {
            for (const item of checklist.items) {
              await checklistRepo.createItem(ctx.db, {
                checklistId: newChecklist.id,
                title: item.title,
                createdBy: userId,
                completed: item.completed ?? false,
              });
            }
          }
          await cardActivityRepo.create(ctx.db, {
            type: "card.updated.checklist.added",
            cardId: newCard.id,
            toTitle: newChecklist.name,
            createdBy: userId,
          });
        }
      }

      return { publicId: newCard.publicId };
    }),
});
