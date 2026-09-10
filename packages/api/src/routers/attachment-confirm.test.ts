import { beforeEach, describe, expect, it, vi } from "vitest";

import * as cardRepo from "@kan/db/repository/card.repo";
import * as cardActivityRepo from "@kan/db/repository/cardActivity.repo";
import * as cardAttachmentRepo from "@kan/db/repository/cardAttachment.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { deleteObject } from "@kan/shared/utils";

import {
  cardCoverPreviewWidths,
  getCardCoverPreviewKey,
  inspectStoredObject,
} from "../utils/cardCoverPreview";
import { assertPermission } from "../utils/permissions";

vi.mock("@kan/db/repository/card.repo", () => ({
  getWorkspaceAndCardIdByCardPublicId: vi.fn(),
}));
vi.mock("@kan/db/client", () => ({
  createDrizzleClient: vi.fn(() => ({})),
}));
vi.mock("@kan/auth/server", () => ({
  initAuth: vi.fn(() => ({ api: {} })),
}));
vi.mock("@kan/db/repository/cardActivity.repo", () => ({ create: vi.fn() }));
vi.mock("@kan/db/repository/cardAttachment.repo", () => ({
  create: vi.fn(),
  getByPublicId: vi.fn(),
  softDeleteWithActivity: vi.fn(),
}));
vi.mock("@kan/db/repository/workspace.repo", () => ({ getById: vi.fn() }));
vi.mock("@kan/shared/utils", () => ({
  deleteObject: vi.fn(),
  generateUID: vi.fn(() => "generated-id"),
  generateUploadUrl: vi.fn(),
  getObjectBytes: vi.fn(),
  getObjectMetadata: vi.fn(),
  putObject: vi.fn(),
}));
vi.mock("../utils/cardCoverPreview", async (importOriginal) => ({
  ...(await importOriginal()),
  inspectStoredObject: vi.fn(),
}));
vi.mock("../utils/permissions", () => ({ assertPermission: vi.fn() }));

const cardPublicId = "card-12345678";
const workspacePublicId = "workspace123";
const s3Key = `${workspacePublicId}/${cardPublicId}/upload-image.png`;
const mockDb = {} as never;
const ctx = {
  user: { id: "user-123" },
  db: mockDb,
} as never;
const input = {
  cardPublicId,
  s3Key,
  filename: "image.png",
  originalFilename: "image.png",
  contentType: "application/octet-stream",
  size: 1234,
};

describe("attachment confirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_ATTACHMENTS_BUCKET_NAME", "attachments");
    vi.mocked(cardRepo.getWorkspaceAndCardIdByCardPublicId).mockResolvedValue({
      id: 1,
      createdBy: "user-123",
      workspaceId: 2,
      workspaceVisibility: "private",
      listPublicId: "list-12345678",
      listName: "Todo",
      boardPublicId: "board-1234567",
      boardName: "Board",
    });
    vi.mocked(workspaceRepo.getById).mockResolvedValue({
      id: 2,
      publicId: workspacePublicId,
    } as never);
    vi.mocked(assertPermission).mockResolvedValue(undefined);
    vi.mocked(inspectStoredObject).mockResolvedValue({
      contentLength: input.size,
      contentType: "image/png",
    });
    vi.mocked(cardAttachmentRepo.create).mockResolvedValue({
      id: 3,
      publicId: "attachment01",
      filename: input.filename,
      originalFilename: input.originalFilename,
      contentType: "image/png",
      size: input.size,
      s3Key,
      createdBy: "user-123",
      createdAt: new Date("2026-09-07T12:00:00Z"),
    });
  });

  it("confirms an owned object using its stored metadata", async () => {
    const { attachmentRouter } = await import("./attachment");
    const result = await attachmentRouter.createCaller(ctx).confirm(input);

    expect(inspectStoredObject).toHaveBeenCalledWith("attachments", s3Key);
    expect(cardAttachmentRepo.create).toHaveBeenCalledWith(mockDb, {
      cardId: 1,
      filename: input.filename,
      originalFilename: input.originalFilename,
      contentType: "image/png",
      size: input.size,
      s3Key,
      createdBy: "user-123",
    });
    expect(cardActivityRepo.create).toHaveBeenCalled();
    expect(result.contentType).toBe("image/png");
  });

  it("rejects a key outside the generated card prefix", async () => {
    const { attachmentRouter } = await import("./attachment");

    await expect(
      attachmentRouter.createCaller(ctx).confirm({
        ...input,
        s3Key: "another-workspace/another-card/private.png",
      }),
    ).rejects.toThrow("does not belong to this card upload");

    expect(inspectStoredObject).not.toHaveBeenCalled();
    expect(cardAttachmentRepo.create).not.toHaveBeenCalled();
  });

  it("rejects a confirmation whose size differs from the stored object", async () => {
    vi.mocked(inspectStoredObject).mockResolvedValue({
      contentLength: input.size + 1,
      contentType: "image/png",
    });
    const { attachmentRouter } = await import("./attachment");

    await expect(
      attachmentRouter.createCaller(ctx).confirm(input),
    ).rejects.toThrow("size does not match");

    expect(cardAttachmentRepo.create).not.toHaveBeenCalled();
  });

  it("commits attachment deletion before removing the original and previews", async () => {
    vi.mocked(cardAttachmentRepo.getByPublicId).mockResolvedValue({
      id: 3,
      publicId: "attachment01",
      cardId: 1,
      deletedAt: null,
      card: { list: { board: { workspaceId: 2 } } },
    } as never);
    vi.mocked(cardAttachmentRepo.softDeleteWithActivity).mockResolvedValue({
      id: 3,
      publicId: "attachment01",
      originalFilename: "image.png",
      s3Key,
      coverCleared: true,
    });
    vi.mocked(deleteObject).mockResolvedValue(undefined);
    const { attachmentRouter } = await import("./attachment");

    await expect(
      attachmentRouter.createCaller(ctx).delete({
        attachmentPublicId: "attachment01",
      }),
    ).resolves.toEqual({ success: true });

    expect(cardAttachmentRepo.softDeleteWithActivity).toHaveBeenCalled();
    expect(vi.mocked(deleteObject).mock.invocationCallOrder[0]).toBeGreaterThan(
      vi.mocked(cardAttachmentRepo.softDeleteWithActivity).mock
        .invocationCallOrder[0] ?? 0,
    );
    expect(deleteObject).toHaveBeenCalledTimes(4);
    expect(deleteObject).toHaveBeenCalledWith("attachments", s3Key);
    for (const width of cardCoverPreviewWidths)
      expect(deleteObject).toHaveBeenCalledWith(
        "attachments",
        getCardCoverPreviewKey("attachment01", width),
      );
  });
});
