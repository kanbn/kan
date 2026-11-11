import type { z } from "zod";
import { Body, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";
import {
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiResponse,
  getSchemaPath,
} from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";

import type { User } from "../../common/interfaces/user.interface.js";
import type { SearchResultSchema } from "./dto/workspace.dto.js";
import { AuthenticatedController } from "../../common/decorators/authenticated-controller.decorator.js";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import {
  CheckSlugAvailabilityQueryDto,
  CheckSlugAvailabilityResponseDto,
  CreateWorkspaceDto,
  SearchBoardResultDto,
  SearchCardResultDto,
  SearchQueryDto,
  UpdateWorkspaceDto,
  WorkspaceCreateResponseDto,
  WorkspaceDeleteResponseDto,
  WorkspaceDetailResponseDto,
  WorkspaceListItemDto,
  WorkspaceUpdateResponseDto,
  WorkspaceWithBoardsResponseDto,
} from "./dto/workspace.dto.js";
import { WorkspaceService } from "./workspace.service.js";

@AuthenticatedController("Workspaces", "workspaces")
@ApiExtraModels(SearchBoardResultDto, SearchCardResultDto)
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Get()
  @ApiOperation({ operationId: "getWorkspaces", summary: "Get all workspaces" })
  @ZodResponse({ status: 200, type: [WorkspaceListItemDto] })
  async all(@CurrentUser() user: User): Promise<WorkspaceListItemDto[]> {
    return this.workspaceService.all({ userId: user.id });
  }

  // Must come before `:workspacePublicId` — otherwise that param route
  // would greedily match this literal path segment.
  @Get("check-slug-availability")
  @ApiOperation({
    operationId: "checkSlugAvailability",
    summary: "Check if a workspace slug is available",
  })
  @ZodResponse({ status: 200, type: CheckSlugAvailabilityResponseDto })
  async checkSlugAvailability(
    @CurrentUser() user: User,
    @Query() query: CheckSlugAvailabilityQueryDto,
  ): Promise<CheckSlugAvailabilityResponseDto> {
    return this.workspaceService.checkSlugAvailability({
      workspaceSlug: query.workspaceSlug,
      workspacePublicId: query.workspacePublicId,
      userId: user.id,
    });
  }

  // Must also come before `:workspacePublicId` for the same reason.
  @Get("has-available-partner-slot")
  @ApiOperation({
    operationId: "hasAvailablePartnerSlot",
    summary: "Check if the user has an available partner license slot",
  })
  @ApiResponse({ status: 200, schema: { type: "boolean" } })
  async hasAvailablePartnerSlot(@CurrentUser() user: User): Promise<boolean> {
    return this.workspaceService.hasAvailablePartnerSlot({ userId: user.id });
  }

  @Get("slug/:workspaceSlug")
  @ApiOperation({
    operationId: "getWorkspaceBySlug",
    summary: "Get a workspace by slug",
  })
  @ApiParam({ name: "workspaceSlug" })
  @ZodResponse({ status: 200, type: WorkspaceWithBoardsResponseDto })
  async bySlug(
    @CurrentUser() user: User,
    @Param("workspaceSlug") workspaceSlug: string,
  ): Promise<WorkspaceWithBoardsResponseDto> {
    return this.workspaceService.bySlug({ workspaceSlug, userId: user.id });
  }

  @Get(":workspacePublicId")
  @ApiOperation({
    operationId: "getWorkspace",
    summary: "Get a workspace by public ID",
  })
  @ApiParam({ name: "workspacePublicId" })
  @ZodResponse({ status: 200, type: WorkspaceDetailResponseDto })
  async byId(
    @CurrentUser() user: User,
    @Param("workspacePublicId") workspacePublicId: string,
  ): Promise<WorkspaceDetailResponseDto> {
    return this.workspaceService.byId({ workspacePublicId, userId: user.id });
  }

  @Get(":workspacePublicId/search")
  @ApiOperation({
    operationId: "searchWorkspace",
    summary: "Search boards and cards in a workspace",
  })
  @ApiParam({ name: "workspacePublicId" })
  @ApiResponse({
    status: 200,
    schema: {
      type: "array",
      items: {
        oneOf: [
          { $ref: getSchemaPath(SearchBoardResultDto) },
          { $ref: getSchemaPath(SearchCardResultDto) },
        ],
      },
    },
  })
  async search(
    @CurrentUser() user: User,
    @Param("workspacePublicId") workspacePublicId: string,
    @Query() query: SearchQueryDto,
  ): Promise<z.infer<typeof SearchResultSchema>[]> {
    return this.workspaceService.search({
      workspacePublicId,
      query: query.query,
      limit: query.limit,
      userId: user.id,
    });
  }

  @Post()
  @ApiOperation({
    operationId: "createWorkspace",
    summary: "Create a workspace",
  })
  @ZodResponse({ status: 201, type: WorkspaceCreateResponseDto })
  async create(
    @CurrentUser() user: User,
    @Body() input: CreateWorkspaceDto,
  ): Promise<WorkspaceCreateResponseDto> {
    return this.workspaceService.create({
      name: input.name,
      description: input.description,
      slug: input.slug,
      userId: user.id,
      userEmail: user.email,
    });
  }

  @Put(":workspacePublicId")
  @ApiOperation({
    operationId: "updateWorkspace",
    summary: "Update a workspace",
  })
  @ApiParam({ name: "workspacePublicId" })
  @ZodResponse({ status: 200, type: WorkspaceUpdateResponseDto })
  async update(
    @CurrentUser() user: User,
    @Param("workspacePublicId") workspacePublicId: string,
    @Body() input: UpdateWorkspaceDto,
  ): Promise<WorkspaceUpdateResponseDto> {
    return this.workspaceService.update({
      workspacePublicId,
      userId: user.id,
      name: input.name,
      slug: input.slug,
      description: input.description,
      showEmailsToMembers: input.showEmailsToMembers,
      weekStartDay: input.weekStartDay,
    });
  }

  @Delete(":workspacePublicId")
  @ApiOperation({
    operationId: "deleteWorkspace",
    summary: "Delete a workspace",
  })
  @ApiParam({ name: "workspacePublicId" })
  @ZodResponse({ status: 200, type: WorkspaceDeleteResponseDto })
  async delete(
    @CurrentUser() user: User,
    @Param("workspacePublicId") workspacePublicId: string,
  ): Promise<WorkspaceDeleteResponseDto> {
    return this.workspaceService.delete({
      workspacePublicId,
      userId: user.id,
    });
  }
}
