import { Body, Delete, Get, Post, Query } from "@nestjs/common";
import { ApiOperation } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";

import type { User } from "../../common/interfaces/user.interface.js";
import { AuthenticatedController } from "../../common/decorators/authenticated-controller.decorator.js";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import {
  AuthorizationUrlQueryDto,
  AuthorizationUrlResponseDto,
  DisconnectIntegrationDto,
  EmptyResponseDto,
  GitHubStatusResponseDto,
  IntegrationProviderDto,
  SaveGitHubTokenDto,
  SuccessResponseDto,
} from "./dto/integration.dto.js";
import { IntegrationService } from "./integration.service.js";

@AuthenticatedController("Integration", "integration")
export class IntegrationController {
  constructor(private readonly integrationService: IntegrationService) {}

  @Get("providers")
  @ApiOperation({
    operationId: "getIntegrationProviders",
    summary: "Get the current user's integration providers",
  })
  @ZodResponse({ status: 200, type: [IntegrationProviderDto] })
  async providers(@CurrentUser() user: User) {
    return this.integrationService.providers({ userId: user.id });
  }

  @Post("disconnect")
  @ApiOperation({
    operationId: "disconnectIntegration",
    summary: "Disconnect an integration",
  })
  @ZodResponse({ status: 201, type: EmptyResponseDto })
  async disconnect(
    @CurrentUser() user: User,
    @Body() input: DisconnectIntegrationDto,
  ) {
    return this.integrationService.disconnect({
      userId: user.id,
      provider: input.provider,
    });
  }

  @Get("authorize")
  @ApiOperation({
    operationId: "getIntegrationAuthorizationUrl",
    summary: "Get the authorization URL for an integration",
  })
  @ZodResponse({ status: 200, type: AuthorizationUrlResponseDto })
  async getAuthorizationUrl(
    @CurrentUser() user: User,
    @Query() query: AuthorizationUrlQueryDto,
  ) {
    return this.integrationService.getAuthorizationUrl({
      userId: user.id,
      provider: query.provider,
    });
  }

  @Post("github/token")
  @ApiOperation({
    operationId: "saveGitHubToken",
    summary: "Save a GitHub access token for the current user",
  })
  @ZodResponse({ status: 201, type: SuccessResponseDto })
  async saveGitHubToken(
    @CurrentUser() user: User,
    @Body() input: SaveGitHubTokenDto,
  ) {
    return this.integrationService.saveGitHubToken({
      userId: user.id,
      token: input.token,
    });
  }

  @Delete("github")
  @ApiOperation({
    operationId: "disconnectGitHub",
    summary: "Disconnect the current user's GitHub integration",
  })
  @ZodResponse({ status: 200, type: SuccessResponseDto })
  async disconnectGitHub(@CurrentUser() user: User) {
    return this.integrationService.disconnectGitHub({ userId: user.id });
  }

  @Get("github/status")
  @ApiOperation({
    operationId: "getGitHubStatus",
    summary: "Check whether the current user has connected GitHub",
  })
  @ZodResponse({ status: 200, type: GitHubStatusResponseDto })
  async getGitHubStatus(@CurrentUser() user: User) {
    return this.integrationService.getGitHubStatus({ userId: user.id });
  }
}
