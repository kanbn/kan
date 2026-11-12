import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";

import type { WebhookEvent } from "@kan/db/schema";
import * as webhookRepo from "@kan/db/repository/webhook.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { assertPermission } from "@kan/server/utils/permissions";
import {
  createCardWebhookPayload,
  sendWebhookToUrl,
} from "@kan/server/utils/webhook";

import { assertFound } from "../../common/assert-found.util.js";
import { db } from "../../common/session.util.js";

const toResponse = (webhook: {
  publicId: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  active: boolean;
  createdAt: Date;
  updatedAt?: Date | null;
}) => ({
  publicId: webhook.publicId,
  name: webhook.name,
  url: webhook.url,
  events: webhook.events,
  active: webhook.active,
  createdAt: webhook.createdAt.toISOString(),
  updatedAt: webhook.updatedAt?.toISOString() ?? null,
});

@Injectable()
export class WebhookService {
  private async assertCanManage(workspacePublicId: string, userId: string) {
    const workspace = await assertFound(
      workspaceRepo.getByPublicId(db, workspacePublicId),
      "Workspace not found",
    );
    await assertPermission(db, userId, workspace.id, "workspace:manage");
    return workspace;
  }

  private async getWebhookInWorkspace(
    workspacePublicId: string,
    webhookPublicId: string,
    userId: string,
  ) {
    const workspace = await this.assertCanManage(workspacePublicId, userId);
    const webhook = await webhookRepo.getByPublicId(db, webhookPublicId);

    if (!webhook || webhook.workspaceId !== workspace.id)
      throw new NotFoundException("Webhook not found");

    return webhook;
  }

  async list(input: { workspacePublicId: string; userId: string }) {
    const workspace = await this.assertCanManage(
      input.workspacePublicId,
      input.userId,
    );
    const webhooks = await webhookRepo.getAllByWorkspaceId(db, workspace.id);
    return webhooks.map(toResponse);
  }

  async create(input: {
    workspacePublicId: string;
    name: string;
    url: string;
    secret?: string;
    events: WebhookEvent[];
    userId: string;
  }) {
    const workspace = await this.assertCanManage(
      input.workspacePublicId,
      input.userId,
    );

    const result = await webhookRepo.create(db, {
      workspaceId: workspace.id,
      name: input.name,
      url: input.url,
      secret: input.secret,
      events: input.events,
      createdBy: input.userId,
    });

    if (!result)
      throw new InternalServerErrorException("Unable to create webhook");

    return toResponse(result);
  }

  async update(input: {
    workspacePublicId: string;
    webhookPublicId: string;
    name?: string;
    url?: string;
    secret?: string;
    events?: WebhookEvent[];
    active?: boolean;
    userId: string;
  }) {
    await this.getWebhookInWorkspace(
      input.workspacePublicId,
      input.webhookPublicId,
      input.userId,
    );

    const result = await webhookRepo.update(db, input.webhookPublicId, {
      name: input.name,
      url: input.url,
      secret: input.secret,
      events: input.events,
      active: input.active,
    });

    if (!result)
      throw new InternalServerErrorException("Unable to update webhook");

    return toResponse(result);
  }

  async delete(input: {
    workspacePublicId: string;
    webhookPublicId: string;
    userId: string;
  }) {
    await this.getWebhookInWorkspace(
      input.workspacePublicId,
      input.webhookPublicId,
      input.userId,
    );

    await webhookRepo.hardDelete(db, input.webhookPublicId);

    return { success: true };
  }

  async test(input: {
    workspacePublicId: string;
    webhookPublicId: string;
    userId: string;
    userName: string | null;
  }) {
    const webhook = await this.getWebhookInWorkspace(
      input.workspacePublicId,
      input.webhookPublicId,
      input.userId,
    );

    const testPayload = createCardWebhookPayload(
      "card.created",
      {
        id: "test-card-id",
        publicId: "test-card-public-id",
        title: "Test Card",
        description: "This is a test webhook payload",
        dueDate: null,
        listId: "test-list-id",
      },
      {
        boardId: "test-board-id",
        boardName: "Test Board",
        listName: "Test List",
        user: { id: input.userId, name: input.userName ?? "Test User" },
      },
    );

    return sendWebhookToUrl(
      webhook.url,
      webhook.secret ?? undefined,
      testPayload,
    );
  }
}
