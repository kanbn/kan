import { TRPCError } from "@trpc/server";
import { z } from "zod";

import * as boardRepo from "@kan/db/repository/board.repo";
import * as cardRepo from "@kan/db/repository/card.repo";
import * as activityRepo from "@kan/db/repository/cardActivity.repo";
import * as listRepo from "@kan/db/repository/list.repo";

import type { BoardEvent } from "../events";
import { publishBoardEventToWebsocket } from "../events";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { assertCanDelete, assertCanEdit, assertPermission } from "../utils/permissions";
import { createListWebhookPayload, sendWebhooksForWorkspace } from "../utils/webhook";
import { createLogger } from "@kan/logger";

const log = createLogger("api:events");

const emitBoardEvent = async (
  workspacePublicId: string | null | undefined,
  event: BoardEvent,
  actorUserId?: string,
) => {
  if (!workspacePublicId) {
    return;
  }

  try {
    await publishBoardEventToWebsocket(workspacePublicId, actorUserId ? { ...event, actorUserId } : event);
  } catch (error) {
    log.error({ err: error }, "failed to publish board event");
  }
};

export const listRouter = createTRPCRouter({
  create: protectedProcedure
    .meta({
      openapi: {
        summary: "Create a list",
        method: "POST",
        path: "/lists",
        description: "Creates a new list for a given board",
        tags: ["Lists"],
        protect: true,
      },
    })
    .input(
      z.object({
        name: z.string().min(1),
        boardPublicId: z.string().min(12),
      }),
    )
    .output(z.custom<Awaited<ReturnType<typeof listRepo.create>>>())
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const board = await boardRepo.getWorkspaceAndBoardIdByBoardPublicId(
        ctx.db,
        input.boardPublicId,
      );

      if (!board)
        throw new TRPCError({
          message: `Board with public ID ${input.boardPublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertPermission(ctx.db, userId, board.workspaceId, "list:create");

      const result = await listRepo.create(ctx.db, {
        name: input.name,
        createdBy: userId,
        boardId: board.id,
      });

      if (!result)
        throw new TRPCError({
          message: `Failed to create list`,
          code: "INTERNAL_SERVER_ERROR",
        });

      await emitBoardEvent(board.workspace?.publicId, {
        scope: "board",
        type: "list.created",
        boardId: board.id,
        listPublicId: result.publicId,
        name: result.name,
        index: result.index,
      }, userId);

      void sendWebhooksForWorkspace(
        ctx.db,
        board.workspaceId,
        createListWebhookPayload(
          "list.created",
          { id: result.publicId, name: result.name },
          {
            boardId: input.boardPublicId,
            user: ctx.user ? { id: ctx.user.id, name: ctx.user.name } : undefined,
          },
        ),
      );

      return result;
    }),
  delete: protectedProcedure
    .meta({
      openapi: {
        summary: "Delete a list",
        method: "DELETE",
        path: "/lists/{listPublicId}",
        description: "Deletes a list by its public ID",
        tags: ["Lists"],
        protect: true,
      },
    })
    .input(
      z.object({
        listPublicId: z.string().min(12),
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

      const list = await listRepo.getWorkspaceAndListIdByListPublicId(
        ctx.db,
        input.listPublicId,
      );

      if (!list)
        throw new TRPCError({
          message: `List with public ID ${input.listPublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertCanDelete(
        ctx.db,
        userId,
        list.workspaceId,
        "list:delete",
        list.createdBy,
      );

      const deletedAt = new Date();

      const deletedList = await listRepo.softDeleteById(ctx.db, {
        listId: list.id,
        deletedAt,
        deletedBy: userId,
      });

      if (!deletedList)
        throw new TRPCError({
          message: `Failed to delete list`,
          code: "INTERNAL_SERVER_ERROR",
        });

      const deletedCards = await cardRepo.softDeleteAllByListIds(ctx.db, {
        listIds: [list.id],
        deletedAt,
        deletedBy: userId,
      });

      if (!Array.isArray(deletedCards))
        throw new TRPCError({
          message: `Failed to delete cards`,
          code: "INTERNAL_SERVER_ERROR",
        });

      const activities = deletedCards.map((card) => ({
        type: "card.archived" as const,
        createdBy: userId,
        cardId: card.id,
      }));

      if (activities.length) await activityRepo.bulkCreate(ctx.db, activities);

      await emitBoardEvent(list.workspacePublicId, {
        scope: "board",
        type: "list.deleted",
        boardId: list.boardId,
        listPublicId: input.listPublicId,
      }, userId);

      void sendWebhooksForWorkspace(
        ctx.db,
        list.workspaceId,
        createListWebhookPayload(
          "list.deleted",
          { id: input.listPublicId, name: list.name },
          {
            boardId: list.boardPublicId,
            boardName: list.boardName,
            user: ctx.user ? { id: ctx.user.id, name: ctx.user.name } : undefined,
          },
        ),
      );

      return { success: true };
    }),
  update: protectedProcedure
    .meta({
      openapi: {
        summary: "Update a list",
        method: "PUT",
        path: "/lists/{listPublicId}",
        description: "Updates a list by its public ID",
        tags: ["Lists"],
        protect: true,
      },
    })
    .input(
      z.object({
        listPublicId: z.string().min(12),
        name: z.string().min(1).optional(),
        index: z.number().optional(),
      }),
    )
    .output(
      z.custom<
        | Awaited<ReturnType<typeof listRepo.update>>
        | Awaited<ReturnType<typeof listRepo.reorder>>
      >(),
    )
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

      await assertCanEdit(
        ctx.db,
        userId,
        list.workspaceId,
        "list:edit",
        list.createdBy,
      );

      let result: { name: string; publicId: string } | undefined;

      if (input.name) {
        result = await listRepo.update(
          ctx.db,
          { name: input.name },
          { listPublicId: input.listPublicId },
        );
      }

      if (input.index !== undefined) {
        result = await listRepo.reorder(ctx.db, {
          listPublicId: input.listPublicId,
          newIndex: input.index,
        });
      }

      if (!result)
        throw new TRPCError({
          message: `Failed to update list`,
          code: "INTERNAL_SERVER_ERROR",
        });

      if (input.name !== undefined || input.index !== undefined) {
        await emitBoardEvent(list.workspacePublicId, {
          scope: "board",
          type: "list.updated",
          boardId: list.boardId,
          listPublicId: input.listPublicId,
          name: input.name,
          index: input.index,
        }, userId);

        void sendWebhooksForWorkspace(
          ctx.db,
          list.workspaceId,
          createListWebhookPayload(
            "list.updated",
            { id: input.listPublicId, name: result.name },
            {
              boardId: list.boardPublicId,
              boardName: list.boardName,
              user: ctx.user ? { id: ctx.user.id, name: ctx.user.name } : undefined,
            },
          ),
        );
      }

      return result;
    }),
});
