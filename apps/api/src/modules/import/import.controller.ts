import { Body, Get, Post } from "@nestjs/common";
import { ApiOperation } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";

import type { User } from "../../common/interfaces/user.interface.js";
import { AuthenticatedController } from "../../common/decorators/authenticated-controller.decorator.js";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import {
  ExternalSourceItemDto,
  ImportGitHubProjectsDto,
  ImportGitHubProjectsResponseDto,
  ImportTrelloBoardsDto,
  ImportTrelloBoardsResponseDto,
} from "./dto/import.dto.js";
import { ImportService } from "./import.service.js";

@AuthenticatedController("Integrations", "integrations")
export class ImportSourceController {
  constructor(private readonly importService: ImportService) {}

  @Get("trello/boards")
  @ApiOperation({
    operationId: "getTrelloBoards",
    summary: "List the current user's Trello boards",
  })
  @ZodResponse({ status: 200, type: [ExternalSourceItemDto] })
  async getTrelloBoards(@CurrentUser() user: User) {
    return this.importService.getTrelloBoards({ userId: user.id });
  }

  @Get("github/projects")
  @ApiOperation({
    operationId: "getGitHubProjects",
    summary: "List the current user's GitHub projects",
  })
  @ZodResponse({ status: 200, type: [ExternalSourceItemDto] })
  async getGitHubProjects(@CurrentUser() user: User) {
    return this.importService.getGitHubProjects({ userId: user.id });
  }
}

@AuthenticatedController("Imports", "imports")
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post("trello/boards")
  @ApiOperation({
    operationId: "importTrelloBoards",
    summary: "Import boards from Trello into a workspace",
  })
  @ZodResponse({ status: 201, type: ImportTrelloBoardsResponseDto })
  async importTrelloBoards(
    @CurrentUser() user: User,
    @Body() input: ImportTrelloBoardsDto,
  ) {
    return this.importService.importTrelloBoards({ ...input, userId: user.id });
  }

  @Post("github/projects")
  @ApiOperation({
    operationId: "importGitHubProjects",
    summary: "Import projects from GitHub into a workspace",
  })
  @ZodResponse({ status: 201, type: ImportGitHubProjectsResponseDto })
  async importGitHubProjects(
    @CurrentUser() user: User,
    @Body() input: ImportGitHubProjectsDto,
  ) {
    return this.importService.importGitHubProjects({
      ...input,
      userId: user.id,
    });
  }
}
