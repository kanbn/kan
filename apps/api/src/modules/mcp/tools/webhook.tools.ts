import { Injectable } from "@nestjs/common";
import { Tool } from "@rekog/mcp-nest";
import { z } from "zod";

import {
  CreateWebhookSchema,
  UpdateWebhookSchema,
} from "../../webhook/dto/webhook.dto.js";
import { WebhookService } from "../../webhook/webhook.service.js";
import { requireMcpUser } from "../mcp-user.util.js";
import { webhookPublicId, workspacePublicId } from "./public-ids.js";

const WorkspaceIdSchema = z.object({
  workspacePublicId,
});

const WebhookIdSchema = WorkspaceIdSchema.extend({
  webhookPublicId,
});

const CreateWebhookWithWorkspaceSchema = CreateWebhookSchema.extend(
  WorkspaceIdSchema.shape,
);

const UpdateWebhookWithIdSchema = UpdateWebhookSchema.extend(
  WebhookIdSchema.shape,
);

type McpRequest = { user?: unknown } | undefined;

@Injectable()
export class WebhookTools {
  constructor(private readonly webhookService: WebhookService) {}

  @Tool({
    name: "list_webhooks",
    description:
      "List a workspace's webhooks. Requires workspace manage permission.",
    parameters: WorkspaceIdSchema,
  })
  async listWebhooks(
    args: z.infer<typeof WorkspaceIdSchema>,
    _context: unknown,
    rawRequest: McpRequest,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.webhookService.list({ ...args, userId: user.id });
  }

  @Tool({
    name: "create_webhook",
    description: "Create a webhook for a workspace (HTTPS, public hosts only).",
    parameters: CreateWebhookWithWorkspaceSchema,
  })
  async createWebhook(
    args: z.infer<typeof CreateWebhookWithWorkspaceSchema>,
    _context: unknown,
    rawRequest: McpRequest,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.webhookService.create({ ...args, userId: user.id });
  }

  @Tool({
    name: "update_webhook",
    description: "Update a workspace webhook.",
    parameters: UpdateWebhookWithIdSchema,
  })
  async updateWebhook(
    args: z.infer<typeof UpdateWebhookWithIdSchema>,
    _context: unknown,
    rawRequest: McpRequest,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.webhookService.update({ ...args, userId: user.id });
  }

  @Tool({
    name: "delete_webhook",
    description: "Delete a workspace webhook.",
    parameters: WebhookIdSchema,
  })
  async deleteWebhook(
    args: z.infer<typeof WebhookIdSchema>,
    _context: unknown,
    rawRequest: McpRequest,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.webhookService.delete({ ...args, userId: user.id });
  }

  @Tool({
    name: "test_webhook",
    description: "Send a test payload to a workspace webhook.",
    parameters: WebhookIdSchema,
  })
  async testWebhook(
    args: z.infer<typeof WebhookIdSchema>,
    _context: unknown,
    rawRequest: McpRequest,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.webhookService.test({
      ...args,
      userId: user.id,
      userName: user.name,
    });
  }
}
