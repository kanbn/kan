import { TRPCError } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import { z } from "zod";

import * as workspaceRepo from "@kan/db/repository/workspace.repo";

import type { BoardEvent, CardEvent } from "../events";
import { subscribeToBoardEvents, subscribeToCardEvents } from "../events";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { assertUserInWorkspace } from "../utils/auth";

export const eventsRouter = createTRPCRouter({
  board: protectedProcedure
    .input(z.object({ workspacePublicId: z.string().min(12) }))
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

      return observable<BoardEvent>((emit) => {
        const unsubscribe = subscribeToBoardEvents(
          input.workspacePublicId,
          (event) => {
            emit.next(event);
          },
        );

        return () => {
          unsubscribe();
        };
      });
    }),
  card: protectedProcedure
    .input(z.object({ workspacePublicId: z.string().min(12) }))
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

      return observable<CardEvent>((emit) => {
        const unsubscribe = subscribeToCardEvents(
          input.workspacePublicId,
          (event) => {
            emit.next(event);
          },
        );

        return () => {
          unsubscribe();
        };
      });
    }),
});
