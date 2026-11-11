import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";

import type { User } from "../../common/interfaces/user.interface.js";
import { AuthenticatedController } from "../../common/decorators/authenticated-controller.decorator.js";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import { BoardService } from "./board.service.js";
import {
  BoardBySlugDto,
  BoardBySlugQueryDto,
  BoardCreateResponseDto,
  BoardDetailDto,
  BoardDetailQueryDto,
  BoardListItemDto,
  BoardListQueryDto,
  BoardSlugAvailabilityDto,
  BoardSlugAvailabilityQueryDto,
  BoardUpdateResponseDto,
  CreateBoardDto,
  MoveBoardDto,
  SuccessResponseDto,
  UpdateBoardDto,
} from "./dto/board.dto.js";

@AuthenticatedController("Boards", "workspaces/:workspacePublicId/boards")
@ApiParam({ name: "workspacePublicId" })
export class WorkspaceBoardController {
  constructor(private readonly boardService: BoardService) {}

  @Get()
  @ApiOperation({
    operationId: "getBoards",
    summary: "List a workspace's boards",
  })
  @ZodResponse({ status: 200, type: [BoardListItemDto] })
  async all(
    @CurrentUser() user: User,
    @Param("workspacePublicId") workspacePublicId: string,
    @Query() query: BoardListQueryDto,
  ) {
    return this.boardService.all({
      workspacePublicId,
      type: query.type,
      archived: query.archived,
      userId: user.id,
    });
  }

  @Post()
  @ApiOperation({ operationId: "createBoard", summary: "Create a board" })
  @ZodResponse({ status: 201, type: BoardCreateResponseDto })
  async create(
    @CurrentUser() user: User,
    @Param("workspacePublicId") workspacePublicId: string,
    @Body() input: CreateBoardDto,
  ) {
    return this.boardService.create({
      workspacePublicId,
      ...input,
      userId: user.id,
    });
  }
}

@AuthenticatedController("Boards", "boards")
export class BoardController {
  constructor(private readonly boardService: BoardService) {}

  @Get(":boardPublicId")
  @ApiOperation({
    operationId: "getBoard",
    summary: "Get a board by public ID",
  })
  @ApiParam({ name: "boardPublicId" })
  @ZodResponse({ status: 200, type: BoardDetailDto })
  async byId(
    @CurrentUser() user: User,
    @Param("boardPublicId") boardPublicId: string,
    @Query() query: BoardDetailQueryDto,
  ) {
    return this.boardService.byId({
      boardPublicId,
      ...query,
      userId: user.id,
    });
  }

  @Put(":boardPublicId")
  @ApiOperation({ operationId: "updateBoard", summary: "Update a board" })
  @ApiParam({ name: "boardPublicId" })
  @ZodResponse({ status: 200, type: BoardUpdateResponseDto })
  async update(
    @CurrentUser() user: User,
    @Param("boardPublicId") boardPublicId: string,
    @Body() input: UpdateBoardDto,
  ) {
    return this.boardService.update({
      boardPublicId,
      ...input,
      userId: user.id,
    });
  }

  @Delete(":boardPublicId")
  @ApiOperation({ operationId: "deleteBoard", summary: "Delete a board" })
  @ApiParam({ name: "boardPublicId" })
  @ZodResponse({ status: 200, type: SuccessResponseDto })
  async delete(
    @CurrentUser() user: User,
    @Param("boardPublicId") boardPublicId: string,
  ) {
    return this.boardService.delete({ boardPublicId, userId: user.id });
  }

  @Post(":boardPublicId/move")
  @ApiOperation({
    operationId: "moveBoard",
    summary: "Move a board to another workspace",
  })
  @ApiParam({ name: "boardPublicId" })
  @ZodResponse({ status: 201, type: SuccessResponseDto })
  async move(
    @CurrentUser() user: User,
    @Param("boardPublicId") boardPublicId: string,
    @Body() input: MoveBoardDto,
  ) {
    return this.boardService.move({
      boardPublicId,
      targetWorkspacePublicId: input.targetWorkspacePublicId,
      userId: user.id,
    });
  }

  @Get(":boardPublicId/check-slug-availability")
  @ApiOperation({
    operationId: "checkBoardSlugAvailability",
    summary: "Check if a board slug is available",
  })
  @ApiParam({ name: "boardPublicId" })
  @ZodResponse({ status: 200, type: BoardSlugAvailabilityDto })
  async checkSlugAvailability(
    @Param("boardPublicId") boardPublicId: string,
    @Query() query: BoardSlugAvailabilityQueryDto,
  ) {
    return this.boardService.checkSlugAvailability({
      boardPublicId,
      boardSlug: query.boardSlug,
    });
  }
}

// Public: anonymous visitors can view boards whose visibility is "public".
@ApiTags("Boards")
@Controller("workspaces/:workspaceSlug/boards/:boardSlug")
export class PublicBoardController {
  constructor(private readonly boardService: BoardService) {}

  @Get()
  @ApiOperation({
    operationId: "getPublicBoardBySlug",
    summary: "Get a public board by workspace and board slug",
  })
  @ApiParam({ name: "workspaceSlug" })
  @ApiParam({ name: "boardSlug" })
  @ZodResponse({ status: 200, type: BoardBySlugDto })
  async bySlug(
    @Param("workspaceSlug") workspaceSlug: string,
    @Param("boardSlug") boardSlug: string,
    @Query() query: BoardBySlugQueryDto,
  ) {
    return this.boardService.bySlug({ workspaceSlug, boardSlug, ...query });
  }
}
