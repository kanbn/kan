import { Injectable } from "@nestjs/common";
import { TRPCError } from "@trpc/server";

import {
  assertBoardAccess,
  assertCanManageBoardMembers,
  assertPermission,
} from "@kan/api/utils/permissions";
import * as boardRepo from "@kan/db/repository/board.repo";
import * as boardMemberRepo from "@kan/db/repository/boardMember.repo";
import * as memberRepo from "@kan/db/repository/member.repo";

import { db } from "../../common/session.util.js";

type BoardMemberRole = "admin" | "member";

@Injectable()
export class BoardMemberService {
  private async getRegularBoardOrThrow(boardPublicId: string) {
    const board = await boardRepo.getWorkspaceAndBoardIdByBoardPublicId(
      db,
      boardPublicId,
    );

    if (!board || board.deletedAt)
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
  }

  private async getWorkspaceMemberOrThrow(
    workspaceMemberPublicId: string,
    workspaceId: number,
    opts: { requireActive: boolean },
  ) {
    const member = await memberRepo.getByPublicId(db, workspaceMemberPublicId);

    if (!member || member.workspaceId !== workspaceId || member.deletedAt)
      throw new TRPCError({
        message: `Workspace member with public ID ${workspaceMemberPublicId} not found`,
        code: "NOT_FOUND",
      });

    if (opts.requireActive && member.status !== "active")
      throw new TRPCError({
        message: `Only active workspace members can be added to a board`,
        code: "BAD_REQUEST",
      });

    return member;
  }

  async all(input: { boardPublicId: string; userId: string }) {
    const board = await this.getRegularBoardOrThrow(input.boardPublicId);

    await assertPermission(db, input.userId, board.workspaceId, "board:view");
    await assertBoardAccess(db, input.userId, board);

    const members = await boardMemberRepo.getByBoardId(db, board.id);

    return members.map((boardMember) => ({
      publicId: boardMember.member.publicId,
      email: boardMember.member.email,
      status: boardMember.member.status,
      role: boardMember.role,
      workspaceRole: boardMember.member.role,
      createdAt: boardMember.createdAt.toISOString(),
      user: boardMember.member.user,
    }));
  }

  async add(input: {
    boardPublicId: string;
    workspaceMemberPublicId: string;
    role: BoardMemberRole;
    userId: string;
  }) {
    const board = await this.getRegularBoardOrThrow(input.boardPublicId);

    await assertCanManageBoardMembers(db, input.userId, board);

    const member = await this.getWorkspaceMemberOrThrow(
      input.workspaceMemberPublicId,
      board.workspaceId,
      { requireActive: true },
    );

    const result = await boardMemberRepo.add(db, {
      boardId: board.id,
      workspaceMemberId: member.id,
      role: input.role,
      createdBy: input.userId,
    });

    if (!result)
      throw new TRPCError({
        message: `${member.email} is already a member of this board`,
        code: "CONFLICT",
      });

    return { publicId: member.publicId, role: result.role };
  }

  async updateRole(input: {
    boardPublicId: string;
    workspaceMemberPublicId: string;
    role: BoardMemberRole;
    userId: string;
  }) {
    const board = await this.getRegularBoardOrThrow(input.boardPublicId);

    await assertCanManageBoardMembers(db, input.userId, board);

    const member = await this.getWorkspaceMemberOrThrow(
      input.workspaceMemberPublicId,
      board.workspaceId,
      // Demoting an invited/paused member is fine; promoting one isn't.
      { requireActive: input.role === "admin" },
    );

    let result;
    try {
      result = await boardMemberRepo.updateRole(db, {
        boardId: board.id,
        workspaceMemberId: member.id,
        role: input.role,
      });
    } catch (error) {
      if (error instanceof boardMemberRepo.CannotRemoveLastBoardAdminError)
        throw new TRPCError({ message: error.message, code: "BAD_REQUEST" });

      throw error;
    }

    if (!result)
      throw new TRPCError({
        message: `${member.email} is not a member of this board`,
        code: "NOT_FOUND",
      });

    return { publicId: member.publicId, role: result.role };
  }

  async remove(input: {
    boardPublicId: string;
    workspaceMemberPublicId: string;
    userId: string;
  }) {
    const board = await this.getRegularBoardOrThrow(input.boardPublicId);

    await assertCanManageBoardMembers(db, input.userId, board);

    const member = await this.getWorkspaceMemberOrThrow(
      input.workspaceMemberPublicId,
      board.workspaceId,
      { requireActive: false },
    );

    let result;
    try {
      result = await boardMemberRepo.remove(db, {
        boardId: board.id,
        workspaceMemberId: member.id,
      });
    } catch (error) {
      if (error instanceof boardMemberRepo.CannotRemoveLastBoardAdminError)
        throw new TRPCError({ message: error.message, code: "BAD_REQUEST" });

      throw error;
    }

    if (!result)
      throw new TRPCError({
        message: `${member.email} is not a member of this board`,
        code: "NOT_FOUND",
      });

    return { publicId: member.publicId };
  }
}
