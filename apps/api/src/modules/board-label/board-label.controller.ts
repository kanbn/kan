import { Body, Delete, Get, Param, Post, Put } from "@nestjs/common";
import { ApiOperation, ApiParam } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";

import type { User } from "../../common/interfaces/user.interface.js";
import { AuthenticatedController } from "../../common/decorators/authenticated-controller.decorator.js";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import { SuccessResponseDto } from "../board/dto/board.dto.js";
import { LabelResponseDto, UpdateLabelDto } from "../label/dto/label.dto.js";
import { BoardLabelService } from "./board-label.service.js";

@AuthenticatedController(
  "Board labels",
  "workspaces/:workspacePublicId/board-labels",
)
@ApiParam({ name: "workspacePublicId" })
export class WorkspaceBoardLabelController {
  constructor(private readonly boardLabelService: BoardLabelService) {}

  @Get()
  @ApiOperation({
    operationId: "getBoardLabels",
    summary: "List a workspace's board labels",
  })
  @ZodResponse({ status: 200, type: [LabelResponseDto] })
  async all(
    @CurrentUser() user: User,
    @Param("workspacePublicId") workspacePublicId: string,
  ) {
    return this.boardLabelService.all({ workspacePublicId, userId: user.id });
  }

  @Post()
  @ApiOperation({
    operationId: "createBoardLabel",
    summary: "Create a board label",
  })
  @ZodResponse({ status: 201, type: LabelResponseDto })
  async create(
    @CurrentUser() user: User,
    @Param("workspacePublicId") workspacePublicId: string,
    @Body() input: UpdateLabelDto,
  ) {
    return this.boardLabelService.create({
      workspacePublicId,
      ...input,
      userId: user.id,
    });
  }
}

@AuthenticatedController("Board labels", "board-labels")
@ApiParam({ name: "boardLabelPublicId" })
export class BoardLabelController {
  constructor(private readonly boardLabelService: BoardLabelService) {}

  @Put(":boardLabelPublicId")
  @ApiOperation({
    operationId: "updateBoardLabel",
    summary: "Update a board label",
  })
  @ZodResponse({ status: 200, type: LabelResponseDto })
  async update(
    @CurrentUser() user: User,
    @Param("boardLabelPublicId") boardLabelPublicId: string,
    @Body() input: UpdateLabelDto,
  ) {
    return this.boardLabelService.update({
      boardLabelPublicId,
      ...input,
      userId: user.id,
    });
  }

  @Delete(":boardLabelPublicId")
  @ApiOperation({
    operationId: "deleteBoardLabel",
    summary: "Delete a board label",
  })
  @ZodResponse({ status: 200, type: SuccessResponseDto })
  async delete(
    @CurrentUser() user: User,
    @Param("boardLabelPublicId") boardLabelPublicId: string,
  ) {
    return this.boardLabelService.delete({
      boardLabelPublicId,
      userId: user.id,
    });
  }
}
