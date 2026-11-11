import { beforeEach, describe, expect, it, vi } from "vitest";

import * as permissions from "@kan/api/utils/permissions";
import * as webhookUtils from "@kan/api/utils/webhook";
import * as webhookRepo from "@kan/db/repository/webhook.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";

import { CreateWebhookSchema } from "../dto/webhook.dto.js";
import { WebhookService } from "../webhook.service.js";

const workspace = { id: 1, publicId: "workspace_12345" };
const storedWebhook = {
  id: 3,
  publicId: "webhook_12345",
  workspaceId: 1,
  url: "https://example.com/hook",
  secret: "shh",
};
const row = {
  publicId: "webhook_12345",
  name: "Hook",
  url: "https://example.com/hook",
  events: ["card.created" as const],
  active: true,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: null,
};

let service: WebhookService;

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(permissions, "assertPermission").mockResolvedValue(undefined);
  vi.spyOn(workspaceRepo, "getByPublicId").mockResolvedValue(
    workspace as never,
  );
  service = new WebhookService();
});

describe("CreateWebhookSchema url", () => {
  it.each([
    "http://example.com/webhook",
    "https://localhost/webhook",
    "https://127.0.0.1/webhook",
    "https://192.168.1.1/webhook",
    "https://169.254.169.254/latest",
  ])("rejects %s", (url) => {
    const result = CreateWebhookSchema.safeParse({
      name: "Hook",
      url,
      events: ["card.created"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a public HTTPS URL", () => {
    const result = CreateWebhookSchema.safeParse({
      name: "Hook",
      url: "https://example.com/webhook",
      events: ["card.created"],
    });
    expect(result.success).toBe(true);
  });
});

describe("WebhookService", () => {
  it("lists webhooks with ISO dates after checking workspace:manage", async () => {
    vi.spyOn(webhookRepo, "getAllByWorkspaceId").mockResolvedValue([row]);

    const result = await service.list({
      workspacePublicId: "workspace_12345",
      userId: "user_1",
    });

    expect(result).toEqual([
      { ...row, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: null },
    ]);
    expect(permissions.assertPermission).toHaveBeenCalledWith(
      expect.anything(),
      "user_1",
      1,
      "workspace:manage",
    );
  });

  it("throws NOT_FOUND when the webhook belongs to another workspace", async () => {
    vi.spyOn(webhookRepo, "getByPublicId").mockResolvedValue({
      ...storedWebhook,
      workspaceId: 99,
    } as never);
    const hardDelete = vi.spyOn(webhookRepo, "hardDelete");

    await expect(
      service.delete({
        workspacePublicId: "workspace_12345",
        webhookPublicId: "webhook_12345",
        userId: "user_1",
      }),
    ).rejects.toMatchObject({ status: 404 });
    expect(hardDelete).not.toHaveBeenCalled();
  });

  it("creates a webhook without returning the secret", async () => {
    vi.spyOn(webhookRepo, "create").mockResolvedValue({
      ...row,
      secret: "shh",
    } as never);

    const result = await service.create({
      workspacePublicId: "workspace_12345",
      name: "Hook",
      url: "https://example.com/hook",
      secret: "shh",
      events: ["card.created"],
      userId: "user_1",
    });

    expect(result).not.toHaveProperty("secret");
    expect(result.createdAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("sends a signed test payload to the stored URL", async () => {
    vi.spyOn(webhookRepo, "getByPublicId").mockResolvedValue(
      storedWebhook as never,
    );
    const send = vi
      .spyOn(webhookUtils, "sendWebhookToUrl")
      .mockResolvedValue({ success: true, statusCode: 200 });

    const result = await service.test({
      workspacePublicId: "workspace_12345",
      webhookPublicId: "webhook_12345",
      userId: "user_1",
      userName: "Henry",
    });

    expect(result).toEqual({ success: true, statusCode: 200 });
    expect(send).toHaveBeenCalledWith(
      "https://example.com/hook",
      "shh",
      expect.objectContaining({ event: "card.created" }),
    );
  });
});
