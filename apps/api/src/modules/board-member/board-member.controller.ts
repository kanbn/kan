import { Body, Delete, Get, Param, Post, Put } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiResponse } from "@nestjs/swagger";

import type { User } from "../../common/interfaces/user.interface.js";
import { AuthenticatedController } from "../../common/decorators/authenticated-controller.decorator.js";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import { BoardMemberService } from "./board-member.service.js";
import {
  AddBoardMemberDto,
  BoardMemberDto,
  BoardMemberRemoveResponseDto,
  BoardMemberRoleResultDto,
  UpdateBoardMemberRoleDto,
} from "./dto/board-member.dto.js";

@AuthenticatedController("Board Members", "boards/:boardPublicId/members")
export class BoardMemberController {
  constructor(private readonly boardMemberService: BoardMemberService) {}

  @Get()
  @ApiOperation({
    operationId: "getBoardMembers",
    summary: "List a board's members",
  })
  @ApiParam({ name: "boardPublicId" })
  @ApiResponse({ status: 200, type: BoardMemberDto, isArray: true })
  async all(
    @CurrentUser() user: User,
    @Param("boardPublicId") boardPublicId: string,
  ): Promise<BoardMemberDto[]> {
    return this.boardMemberService.all({ boardPublicId, userId: user.id });
  }

  @Post()
  @ApiOperation({
    operationId: "addBoardMember",
    summary: "Add a workspace member to a board",
  })
  @ApiParam({ name: "boardPublicId" })
  @ApiResponse({ status: 201, type: BoardMemberRoleResultDto })
  async add(
    @CurrentUser() user: User,
    @Param("boardPublicId") boardPublicId: string,
    @Body() input: AddBoardMemberDto,
  ): Promise<BoardMemberRoleResultDto> {
    return this.boardMemberService.add({
      boardPublicId,
      workspaceMemberPublicId: input.workspaceMemberPublicId,
      role: input.role,
      userId: user.id,
    });
  }

  @Put(":workspaceMemberPublicId")
  @ApiOperation({
    operationId: "updateBoardMemberRole",
    summary: "Update a board member's role",
  })
  @ApiParam({ name: "boardPublicId" })
  @ApiParam({ name: "workspaceMemberPublicId" })
  @ApiResponse({ status: 200, type: BoardMemberRoleResultDto })
  async updateRole(
    @CurrentUser() user: User,
    @Param("boardPublicId") boardPublicId: string,
    @Param("workspaceMemberPublicId") workspaceMemberPublicId: string,
    @Body() input: UpdateBoardMemberRoleDto,
  ): Promise<BoardMemberRoleResultDto> {
    return this.boardMemberService.updateRole({
      boardPublicId,
      workspaceMemberPublicId,
      role: input.role,
      userId: user.id,
    });
  }

  @Delete(":workspaceMemberPublicId")
  @ApiOperation({
    operationId: "removeBoardMember",
    summary: "Remove a member from a board",
  })
  @ApiParam({ name: "boardPublicId" })
  @ApiParam({ name: "workspaceMemberPublicId" })
  @ApiResponse({ status: 200, type: BoardMemberRemoveResponseDto })
  async remove(
    @CurrentUser() user: User,
    @Param("boardPublicId") boardPublicId: string,
    @Param("workspaceMemberPublicId") workspaceMemberPublicId: string,
  ): Promise<BoardMemberRemoveResponseDto> {
    return this.boardMemberService.remove({
      boardPublicId,
      workspaceMemberPublicId,
      userId: user.id,
    });
  }
}
