import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as permissions from "@kan/api/utils/permissions";
import * as cardRepo from "@kan/db/repository/card.repo";
import * as cardActivityRepo from "@kan/db/repository/cardActivity.repo";
import * as cardAttachmentRepo from "@kan/db/repository/cardAttachment.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import * as sharedUtils from "@kan/shared/utils";

import { AttachmentService } from "../attachment.service.js";

const card = {
  id: 5,
  workspaceId: 1,
  boardId: 2,
  boardType: "regular",
};

const storedAttachment = {
  id: 9,
  publicId: "attachment_1",
  cardId: 5,
  s3Key: "ws/card/key-file.png",
  originalFilename: "file.png",
  deletedAt: null,
  card: { list: { board: { id: 2, workspaceId: 1, type: "regular" } } },
};

let service: AttachmentService;
const originalBucket = process.env.NEXT_PUBLIC_ATTACHMENTS_BUCKET_NAME;

beforeEach(() => {
  vi.restoreAllMocks();
  process.env.NEXT_PUBLIC_ATTACHMENTS_BUCKET_NAME = "attachments";
  vi.spyOn(permissions, "assertPermission").mockResolvedValue(undefined);
  vi.spyOn(permissions, "assertBoardAccess").mockResolvedValue(undefined);
  vi.spyOn(cardRepo, "getWorkspaceAndCardIdByCardPublicId").mockResolvedValue(
    card as never,
  );
  vi.spyOn(cardActivityRepo, "create").mockResolvedValue(undefined as never);
  service = new AttachmentService();
});

afterEach(() => {
  process.env.NEXT_PUBLIC_ATTACHMENTS_BUCKET_NAME = originalBucket;
});

describe("AttachmentService.generateUploadUrl", () => {
  it("builds a sanitized key scoped to the workspace and card", async () => {
    vi.spyOn(workspaceRepo, "getById").mockResolvedValue({
      publicId: "workspace_1",
    } as never);
    const upload = vi
      .spyOn(sharedUtils, "generateUploadUrl")
      .mockResolvedValue("https://signed/upload");

    const result = await service.generateUploadUrl({
      cardPublicId: "card_12345678",
      filename: "my file (1).png",
      contentType: "image/png",
      userId: "user_1",
    });

    expect(result.url).toBe("https://signed/upload");
    expect(result.key).toMatch(
      /^workspace_1\/card_12345678\/[^/]+-my_file__1_\.png$/,
    );
    expect(upload).toHaveBeenCalledWith(
      "attachments",
      result.key,
      "image/png",
      3600,
    );
    expect(permissions.assertPermission).toHaveBeenCalledWith(
      expect.anything(),
      "user_1",
      1,
      "card:edit",
    );
  });

  it("throws NOT_FOUND when the card does not exist", async () => {
    vi.spyOn(cardRepo, "getWorkspaceAndCardIdByCardPublicId").mockResolvedValue(
      null,
    );

    await expect(
      service.generateUploadUrl({
        cardPublicId: "missing_12345",
        filename: "a.png",
        contentType: "image/png",
        userId: "user_1",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("AttachmentService.confirm", () => {
  it("creates the attachment, logs activity and does not expose the internal id", async () => {
    vi.spyOn(cardAttachmentRepo, "create").mockResolvedValue({
      id: 9,
      publicId: "attachment_1",
      filename: "key-file.png",
      originalFilename: "file.png",
      contentType: "image/png",
      size: 10,
      s3Key: "ws/card/key-file.png",
      createdBy: "user_1",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    } as never);

    const result = await service.confirm({
      cardPublicId: "card_12345678",
      s3Key: "ws/card/key-file.png",
      filename: "key-file.png",
      originalFilename: "file.png",
      contentType: "image/png",
      size: 10,
      userId: "user_1",
    });

    expect(result).not.toHaveProperty("id");
    expect(result.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(cardActivityRepo.create).toHaveBeenCalledWith(expect.anything(), {
      type: "card.updated.attachment.added",
      cardId: 5,
      attachmentId: 9,
      toTitle: "file.png",
      createdBy: "user_1",
    });
  });
});

describe("AttachmentService.delete", () => {
  it("soft deletes and logs activity even when S3 deletion fails", async () => {
    vi.spyOn(cardAttachmentRepo, "getByPublicId").mockResolvedValue(
      storedAttachment as never,
    );
    vi.spyOn(sharedUtils, "deleteObject").mockRejectedValue(new Error("s3"));
    const softDelete = vi
      .spyOn(cardAttachmentRepo, "softDelete")
      .mockResolvedValue(undefined as never);

    const result = await service.delete({
      attachmentPublicId: "attachment_1",
      userId: "user_1",
    });

    expect(result).toEqual({ success: true });
    expect(softDelete).toHaveBeenCalled();
    expect(cardActivityRepo.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: "card.updated.attachment.removed" }),
    );
  });

  it("throws NOT_FOUND for an already-deleted attachment", async () => {
    vi.spyOn(cardAttachmentRepo, "getByPublicId").mockResolvedValue({
      ...storedAttachment,
      deletedAt: new Date(),
    } as never);

    await expect(
      service.delete({ attachmentPublicId: "attachment_1", userId: "user_1" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
