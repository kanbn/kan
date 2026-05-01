import { TRPCError } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import { z } from "zod";

import * as boardRepo from "@kan/db/repository/board.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";

import type { BoardEvent, CardEvent, NotificationEvent, PresenceEvent } from "../events";
import {
  getBoardViewers,
  joinBoard,
  subscribeToBoardEvents,
  subscribeToCardEvents,
  subscribeToNotificationEvents,
  subscribeToPresenceEvents,
} from "../events";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { assertUserInWorkspace } from "../utils/auth";

export const eventsRouter = createTRPCRouter({
  board: protectedProcedure
    .input(
      z.object({
        workspacePublicId: z.string().min(12),
        boardPublicId: z.string().min(12).optional(),
      }),
    )
    .subscription(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: "User not authenticated",
          code: "UNAUTHORIZED",
        });

      const workspace = await workspaceRepo.getByPublicId(
        ctx.db,
        input.workspacePublicId,
      );

      if (!workspace)
        throw new TRPCError({
          message: `Workspace ${input.workspacePublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertUserInWorkspace(ctx.db, userId, workspace.id);

      let filteredBoardId: number | undefined;
      if (input.boardPublicId) {
        const board = await boardRepo.getIdByPublicId(
          ctx.db,
          input.boardPublicId,
        );
        if (!board || board.workspaceId !== workspace.id)
          throw new TRPCError({
            message: `Board ${input.boardPublicId} not found in workspace`,
            code: "NOT_FOUND",
          });
        filteredBoardId = board.id;
      }

      return observable<BoardEvent>((emit) => {
        const unsubscribe = subscribeToBoardEvents(
          input.workspacePublicId,
          (event) => {
            if (
              filteredBoardId !== undefined &&
              "boardId" in event &&
              event.boardId !== filteredBoardId
            )
              return;
            emit.next(event);
          },
        );

        return () => {
          unsubscribe();
        };
      });
    }),
  card: protectedProcedure
    .input(
      z.object({
        workspacePublicId: z.string().min(12),
        boardPublicId: z.string().min(12).optional(),
      }),
    )
    .subscription(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: "User not authenticated",
          code: "UNAUTHORIZED",
        });

      const workspace = await workspaceRepo.getByPublicId(
        ctx.db,
        input.workspacePublicId,
      );

      if (!workspace)
        throw new TRPCError({
          message: `Workspace ${input.workspacePublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertUserInWorkspace(ctx.db, userId, workspace.id);

      let filteredBoardId: number | undefined;
      if (input.boardPublicId) {
        const board = await boardRepo.getIdByPublicId(
          ctx.db,
          input.boardPublicId,
        );
        if (!board || board.workspaceId !== workspace.id)
          throw new TRPCError({
            message: `Board ${input.boardPublicId} not found in workspace`,
            code: "NOT_FOUND",
          });
        filteredBoardId = board.id;
      }

      return observable<CardEvent>((emit) => {
        const unsubscribe = subscribeToCardEvents(
          input.workspacePublicId,
          (event) => {
            if (
              filteredBoardId !== undefined &&
              "boardId" in event &&
              event.boardId !== filteredBoardId
            )
              return;
            emit.next(event);
          },
        );

        return () => {
          unsubscribe();
        };
      });
    }),
  notification: protectedProcedure
    .subscription(async ({ ctx }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: "User not authenticated",
          code: "UNAUTHORIZED",
        });

      return observable<NotificationEvent>((emit) => {
        const unsubscribe = subscribeToNotificationEvents(userId, (event) => {
          emit.next(event);
        });

        return () => {
          unsubscribe();
        };
      });
    }),

  presence: protectedProcedure
    .input(
      z.object({
        workspacePublicId: z.string().min(12),
        boardPublicId: z.string().min(12),
      }),
    )
    .subscription(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: "User not authenticated",
          code: "UNAUTHORIZED",
        });

      const workspace = await workspaceRepo.getByPublicId(
        ctx.db,
        input.workspacePublicId,
      );

      if (!workspace)
        throw new TRPCError({
          message: `Workspace ${input.workspacePublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertUserInWorkspace(ctx.db, userId, workspace.id);

      const viewer = {
        userId,
        userName: ctx.user?.name ?? "Unknown",
        userImage: ctx.user?.image ?? null,
      };

      return observable<PresenceEvent>((emit) => {
        // Tell the joining subscriber who is already present
        const current = getBoardViewers(input.boardPublicId);
        emit.next({
          scope: "presence",
          type: "presence.state",
          boardPublicId: input.boardPublicId,
          viewers: current,
        });

        // Register presence and get cleanup
        const leave = joinBoard(input.boardPublicId, viewer);

        // Forward subsequent presence changes to this subscriber
        const unsubscribe = subscribeToPresenceEvents(
          input.boardPublicId,
          (event) => {
            emit.next(event);
          },
        );

        return () => {
          unsubscribe();
          leave();
        };
      });
    }),
});
