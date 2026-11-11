import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WebhookController } from "../webhook.controller.js";
import { WebhookService } from "../webhook.service.js";

const mockWebhookService = {
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  test: vi.fn(),
};
const user = { id: "user_1", name: "Henry", email: "henry@kan.bn" };

let controller: WebhookController;

beforeEach(async () => {
  vi.clearAllMocks();

  const module: TestingModule = await Test.createTestingModule({
    controllers: [WebhookController],
    providers: [{ provide: WebhookService, useValue: mockWebhookService }],
  }).compile();

  controller = module.get(WebhookController);
});

describe("WebhookController", () => {
  it("passes path params, body and user through to each handler", async () => {
    const body = {
      name: "Hook",
      url: "https://example.com/hook",
      events: ["card.created"],
    };

    await controller.list(user as never, "workspace_12345");
    await controller.create(user as never, "workspace_12345", body as never);
    await controller.update(user as never, "workspace_12345", "webhook_12345", {
      active: false,
    } as never);
    await controller.delete(user as never, "workspace_12345", "webhook_12345");
    await controller.test(user as never, "workspace_12345", "webhook_12345");

    expect(mockWebhookService.list).toHaveBeenCalledWith({
      workspacePublicId: "workspace_12345",
      userId: "user_1",
    });
    expect(mockWebhookService.create).toHaveBeenCalledWith({
      workspacePublicId: "workspace_12345",
      ...body,
      userId: "user_1",
    });
    expect(mockWebhookService.update).toHaveBeenCalledWith({
      workspacePublicId: "workspace_12345",
      webhookPublicId: "webhook_12345",
      active: false,
      userId: "user_1",
    });
    expect(mockWebhookService.delete).toHaveBeenCalledWith({
      workspacePublicId: "workspace_12345",
      webhookPublicId: "webhook_12345",
      userId: "user_1",
    });
    expect(mockWebhookService.test).toHaveBeenCalledWith({
      workspacePublicId: "workspace_12345",
      webhookPublicId: "webhook_12345",
      userId: "user_1",
      userName: "Henry",
    });
  });
});
