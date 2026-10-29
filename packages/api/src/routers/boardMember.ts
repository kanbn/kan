import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { dbClient } from "@kan/db/client";
import * as boardRepo from "@kan/db/repository/board.repo";
import * as boardMemberRepo from "@kan/db/repository/boardMember.repo";
import * as memberRepo from "@kan/db/repository/member.repo";

import {
  boardMemberAddResponseSchema,
  boardMemberRemoveResponseSchema,
  boardMemberRoleSchema,
  boardMemberSchema,
  boardMemberUpdateRoleResponseSchema,
} from "../schemas";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  assertBoardAccess,
  assertCanManageBoardMembers,
  assertPermission,
} from "../utils/permissions";

const getRegularBoardOrThrow = async (
  db: dbClient,
  boardPublicId: string,
) => {
  const board = await boardRepo.getWorkspaceAndBoardIdByBoardPublicId(
    db,
    boardPublicId,
  );

  if (!board)
    throw new TRPCError({
      message: `Board with public ID ${boardPublicId} not found`,
      code: "NOT_FOUND",
    });

  if (board.type !== "regular")
    throw new TRPCError({
      message: `Board membership is only supported for regular boards`,
      code: "BAD_REQUEST",
    });

  return board;
};

const getActiveWorkspaceMemberOrThrow = async (
  db: dbClient,
  workspaceMemberPublicId: string,
  workspaceId: number,
) => {
  const member = await memberRepo.getByPublicId(db, workspaceMemberPublicId);

  if (!member || member.workspaceId !== workspaceId || member.deletedAt)
    throw new TRPCError({
      message: `Workspace member with public ID ${workspaceMemberPublicId} not found`,
      code: "NOT_FOUND",
    });

  if (member.status !== "active")
    throw new TRPCError({
      message: `Only active workspace members can be added to a board`,
      code: "BAD_REQUEST",
    });

  return member;
};

export const boardMemberRouter = createTRPCRouter({
  all: protectedProcedure
    .input(z.object({ boardPublicId: z.string().min(12) }))
    .output(z.array(boardMemberSchema))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const board = await getRegularBoardOrThrow(ctx.db, input.boardPublicId);

      await assertPermission(ctx.db, userId, board.workspaceId, "board:view");
      await assertBoardAccess(ctx.db, userId, board);

      const members = await boardMemberRepo.getByBoardId(ctx.db, board.id);

      return members.map((boardMember) => ({
        publicId: boardMember.member.publicId,
        email: boardMember.member.email,
        status: boardMember.member.status,
        role: boardMember.role,
        workspaceRole: boardMember.member.role,
        createdAt: boardMember.createdAt,
        user: boardMember.member.user,
      }));
    }),
  add: protectedProcedure
    .input(
      z.object({
        boardPublicId: z.string().min(12),
        workspaceMemberPublicId: z.string().min(12),
        role: boardMemberRoleSchema.default("member"),
      }),
    )
    .output(boardMemberAddResponseSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const board = await getRegularBoardOrThrow(ctx.db, input.boardPublicId);

      await assertCanManageBoardMembers(ctx.db, userId, board);

      const member = await getActiveWorkspaceMemberOrThrow(
        ctx.db,
        input.workspaceMemberPublicId,
        board.workspaceId,
      );

      const result = await boardMemberRepo.add(ctx.db, {
        boardId: board.id,
        workspaceMemberId: member.id,
        role: input.role,
        createdBy: userId,
      });

      if (!result)
        throw new TRPCError({
          message: `${member.email} is already a member of this board`,
          code: "CONFLICT",
        });

      return { publicId: member.publicId, role: result.role };
    }),
  updateRole: protectedProcedure
    .input(
      z.object({
        boardPublicId: z.string().min(12),
        workspaceMemberPublicId: z.string().min(12),
        role: boardMemberRoleSchema,
      }),
    )
    .output(boardMemberUpdateRoleResponseSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const board = await getRegularBoardOrThrow(ctx.db, input.boardPublicId);

      await assertCanManageBoardMembers(ctx.db, userId, board);

      const member = await getActiveWorkspaceMemberOrThrow(
        ctx.db,
        input.workspaceMemberPublicId,
        board.workspaceId,
      );

      let result;
      try {
        result = await boardMemberRepo.updateRole(ctx.db, {
          boardId: board.id,
          workspaceMemberId: member.id,
          role: input.role,
        });
      } catch (error) {
        if (error instanceof boardMemberRepo.CannotRemoveLastBoardAdminError)
          throw new TRPCError({
            message: error.message,
            code: "BAD_REQUEST",
          });

        throw error;
      }

      if (!result)
        throw new TRPCError({
          message: `${member.email} is not a member of this board`,
          code: "NOT_FOUND",
        });

      return { publicId: member.publicId, role: result.role };
    }),
  remove: protectedProcedure
    .input(
      z.object({
        boardPublicId: z.string().min(12),
        workspaceMemberPublicId: z.string().min(12),
      }),
    )
    .output(boardMemberRemoveResponseSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const board = await getRegularBoardOrThrow(ctx.db, input.boardPublicId);

      await assertCanManageBoardMembers(ctx.db, userId, board);

      const member = await getActiveWorkspaceMemberOrThrow(
        ctx.db,
        input.workspaceMemberPublicId,
        board.workspaceId,
      );

      let result;
      try {
        result = await boardMemberRepo.remove(ctx.db, {
          boardId: board.id,
          workspaceMemberId: member.id,
        });
      } catch (error) {
        if (error instanceof boardMemberRepo.CannotRemoveLastBoardAdminError)
          throw new TRPCError({
            message: error.message,
            code: "BAD_REQUEST",
          });

        throw error;
      }

      if (!result)
        throw new TRPCError({
          message: `${member.email} is not a member of this board`,
          code: "NOT_FOUND",
        });

      return { publicId: member.publicId };
    }),
});
