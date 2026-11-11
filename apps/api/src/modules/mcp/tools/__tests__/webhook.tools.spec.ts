import type { TestingModule } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WebhookService } from "../../../webhook/webhook.service.js";
import { WebhookTools } from "../webhook.tools.js";

const mockWebhookService = {
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  test: vi.fn(),
};
const user = { id: "user_1", name: "Henry", email: "henry@kan.bn" };
const ids = {
  workspacePublicId: "workspace_12345",
  webhookPublicId: "webhook_12345",
};

let tools: WebhookTools;

beforeEach(async () => {
  vi.clearAllMocks();

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      WebhookTools,
      { provide: WebhookService, useValue: mockWebhookService },
    ],
  }).compile();

  tools = module.get(WebhookTools);
});

describe("WebhookTools", () => {
  it("passes the authenticated MCP user's id and args through to each tool", async () => {
    await tools.listWebhooks(
      { workspacePublicId: "workspace_12345" },
      undefined,
      { user },
    );
    await tools.deleteWebhook(ids, undefined, { user });
    await tools.testWebhook(ids, undefined, { user });

    expect(mockWebhookService.list).toHaveBeenCalledWith({
      workspacePublicId: "workspace_12345",
      userId: "user_1",
    });
    expect(mockWebhookService.delete).toHaveBeenCalledWith({
      ...ids,
      userId: "user_1",
    });
    expect(mockWebhookService.test).toHaveBeenCalledWith({
      ...ids,
      userId: "user_1",
      userName: "Henry",
    });
  });

  it("rejects requests without an authenticated MCP user", async () => {
    await expect(
      tools.deleteWebhook(ids, undefined, undefined),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
