import { Body, Delete, Get, Param, Post, Put } from "@nestjs/common";
import { ApiOperation, ApiParam } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";

import type { User } from "../../common/interfaces/user.interface.js";
import { AuthenticatedController } from "../../common/decorators/authenticated-controller.decorator.js";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import {
  CreateWebhookDto,
  DeleteWebhookResponseDto,
  TestWebhookResponseDto,
  UpdateWebhookDto,
  WebhookResponseDto,
} from "./dto/webhook.dto.js";
import { WebhookService } from "./webhook.service.js";

@AuthenticatedController("Webhooks", "workspaces/:workspacePublicId/webhooks")
@ApiParam({ name: "workspacePublicId" })
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Get()
  @ApiOperation({
    operationId: "getWebhooks",
    summary: "List a workspace's webhooks",
  })
  @ZodResponse({ status: 200, type: [WebhookResponseDto] })
  async list(
    @CurrentUser() user: User,
    @Param("workspacePublicId") workspacePublicId: string,
  ) {
    return this.webhookService.list({ workspacePublicId, userId: user.id });
  }

  @Post()
  @ApiOperation({ operationId: "createWebhook", summary: "Create a webhook" })
  @ZodResponse({ status: 201, type: WebhookResponseDto })
  async create(
    @CurrentUser() user: User,
    @Param("workspacePublicId") workspacePublicId: string,
    @Body() input: CreateWebhookDto,
  ) {
    return this.webhookService.create({
      workspacePublicId,
      ...input,
      userId: user.id,
    });
  }

  @Put(":webhookPublicId")
  @ApiOperation({ operationId: "updateWebhook", summary: "Update a webhook" })
  @ApiParam({ name: "webhookPublicId" })
  @ZodResponse({ status: 200, type: WebhookResponseDto })
  async update(
    @CurrentUser() user: User,
    @Param("workspacePublicId") workspacePublicId: string,
    @Param("webhookPublicId") webhookPublicId: string,
    @Body() input: UpdateWebhookDto,
  ) {
    return this.webhookService.update({
      workspacePublicId,
      webhookPublicId,
      ...input,
      userId: user.id,
    });
  }

  @Delete(":webhookPublicId")
  @ApiOperation({ operationId: "deleteWebhook", summary: "Delete a webhook" })
  @ApiParam({ name: "webhookPublicId" })
  @ZodResponse({ status: 200, type: DeleteWebhookResponseDto })
  async delete(
    @CurrentUser() user: User,
    @Param("workspacePublicId") workspacePublicId: string,
    @Param("webhookPublicId") webhookPublicId: string,
  ) {
    return this.webhookService.delete({
      workspacePublicId,
      webhookPublicId,
      userId: user.id,
    });
  }

  @Post(":webhookPublicId/test")
  @ApiOperation({
    operationId: "testWebhook",
    summary: "Send a test payload to a webhook",
  })
  @ApiParam({ name: "webhookPublicId" })
  @ZodResponse({ status: 201, type: TestWebhookResponseDto })
  async test(
    @CurrentUser() user: User,
    @Param("workspacePublicId") workspacePublicId: string,
    @Param("webhookPublicId") webhookPublicId: string,
  ) {
    return this.webhookService.test({
      workspacePublicId,
      webhookPublicId,
      userId: user.id,
      userName: user.name,
    });
  }
}
