import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AttachmentController,
  CardAttachmentController,
} from "../attachment.controller.js";
import { AttachmentService } from "../attachment.service.js";

const mockAttachmentService = {
  generateUploadUrl: vi.fn(),
  confirm: vi.fn(),
  delete: vi.fn(),
};
const user = { id: "user_1", email: "henry@kan.bn" };

let cardController: CardAttachmentController;
let controller: AttachmentController;

beforeEach(async () => {
  vi.clearAllMocks();

  const module: TestingModule = await Test.createTestingModule({
    controllers: [CardAttachmentController, AttachmentController],
    providers: [
      { provide: AttachmentService, useValue: mockAttachmentService },
    ],
  }).compile();

  cardController = module.get(CardAttachmentController);
  controller = module.get(AttachmentController);
});

describe("CardAttachmentController", () => {
  it("passes the current user's id, path param and body through to generateUploadUrl", async () => {
    await cardController.generateUploadUrl(user as never, "card_12345678", {
      filename: "a.png",
      contentType: "image/png",
      size: 10,
    } as never);

    expect(mockAttachmentService.generateUploadUrl).toHaveBeenCalledWith({
      cardPublicId: "card_12345678",
      filename: "a.png",
      contentType: "image/png",
      userId: "user_1",
    });
  });

  it("passes the current user's id, path param and body through to confirm", async () => {
    const body = {
      s3Key: "k",
      filename: "a.png",
      originalFilename: "a.png",
      contentType: "image/png",
      size: 10,
    };

    await cardController.confirm(user as never, "card_12345678", body as never);

    expect(mockAttachmentService.confirm).toHaveBeenCalledWith({
      cardPublicId: "card_12345678",
      ...body,
      userId: "user_1",
    });
  });
});

describe("AttachmentController", () => {
  it("passes the current user's id and path param through to delete", async () => {
    await controller.delete(user as never, "attachment_1");

    expect(mockAttachmentService.delete).toHaveBeenCalledWith({
      attachmentPublicId: "attachment_1",
      userId: "user_1",
    });
  });
});
