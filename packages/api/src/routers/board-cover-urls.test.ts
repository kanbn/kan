import { beforeEach, describe, expect, it, vi } from "vitest";

import * as boardRepo from "@kan/db/repository/board.repo";
import * as cardAttachmentRepo from "@kan/db/repository/cardAttachment.repo";
import { generateDownloadUrl } from "@kan/shared/utils";

import {
  getCardCoverPreviewKey,
  inspectStoredObject,
} from "../utils/cardCoverPreview";
import { assertPermission } from "../utils/permissions";

vi.mock("@kan/db/repository/board.repo", () => ({
  getCoverAccessByPublicId: vi.fn(),
}));
vi.mock("@kan/db/client", () => ({
  createDrizzleClient: vi.fn(() => ({})),
}));
vi.mock("@kan/auth/server", () => ({
  initAuth: vi.fn(() => ({ api: {} })),
}));
vi.mock("@kan/db/repository/cardAttachment.repo", () => ({
  getSelectedCoverAttachmentsByBoardPublicId: vi.fn(),
}));
vi.mock("@kan/shared/utils", async (importOriginal) => ({
  ...(await importOriginal()),
  generateDownloadUrl: vi.fn(),
}));
vi.mock("../utils/cardCoverPreview", async (importOriginal) => ({
  ...(await importOriginal()),
  inspectStoredObject: vi.fn(),
}));
vi.mock("../utils/permissions", () => ({
  assertCanDelete: vi.fn(),
  assertCanEdit: vi.fn(),
  assertPermission: vi.fn(),
}));

const boardPublicId = "board-1234567";
const attachmentPublicId = "attachment01";
const missingAttachmentPublicId = "attachment02";
const mockDb = {} as never;

describe("board card cover URL resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_ATTACHMENTS_BUCKET_NAME", "attachments");
    vi.mocked(boardRepo.getCoverAccessByPublicId).mockResolvedValue({
      id: 1,
      workspaceId: 2,
      visibility: "public",
    });
    vi.mocked(
      cardAttachmentRepo.getSelectedCoverAttachmentsByBoardPublicId,
    ).mockResolvedValue([{ publicId: attachmentPublicId }]);
    vi.mocked(inspectStoredObject).mockResolvedValue({
      contentLength: 2048,
      contentType: "image/webp",
    });
    vi.mocked(generateDownloadUrl).mockResolvedValue(
      "https://storage.example/preview.webp",
    );
  });

  it("deduplicates a public-board batch and leaves unavailable covers null", async () => {
    const { boardRouter } = await import("./board");
    const result = await boardRouter
      .createCaller({
        db: mockDb,
        user: null,
      } as never)
      .coverUrls({
        boardPublicId,
        attachmentPublicIds: [
          attachmentPublicId,
          attachmentPublicId,
          missingAttachmentPublicId,
        ],
        width: 640,
      });

    expect(
      cardAttachmentRepo.getSelectedCoverAttachmentsByBoardPublicId,
    ).toHaveBeenCalledWith(mockDb, {
      boardPublicId,
      attachmentPublicIds: [attachmentPublicId, missingAttachmentPublicId],
    });
    expect(inspectStoredObject).toHaveBeenCalledTimes(1);
    expect(generateDownloadUrl).toHaveBeenCalledWith(
      "attachments",
      getCardCoverPreviewKey(attachmentPublicId, 640),
      86400,
    );
    expect(result).toEqual({
      [attachmentPublicId]: "https://storage.example/preview.webp",
      [missingAttachmentPublicId]: null,
    });
    expect(assertPermission).not.toHaveBeenCalled();
  });

  it("requires board access before resolving private covers", async () => {
    vi.mocked(boardRepo.getCoverAccessByPublicId).mockResolvedValue({
      id: 1,
      workspaceId: 2,
      visibility: "private",
    });
    const { boardRouter } = await import("./board");

    await expect(
      boardRouter.createCaller({ db: mockDb, user: null } as never).coverUrls({
        boardPublicId,
        attachmentPublicIds: [attachmentPublicId],
        width: 320,
      }),
    ).rejects.toThrow("not authenticated");

    expect(
      cardAttachmentRepo.getSelectedCoverAttachmentsByBoardPublicId,
    ).not.toHaveBeenCalled();
  });

  it("authorizes a private board once for the whole batch", async () => {
    vi.mocked(boardRepo.getCoverAccessByPublicId).mockResolvedValue({
      id: 1,
      workspaceId: 2,
      visibility: "private",
    });
    vi.mocked(assertPermission).mockResolvedValue(undefined);
    const { boardRouter } = await import("./board");

    await boardRouter
      .createCaller({
        db: mockDb,
        user: { id: "user-123" },
      } as never)
      .coverUrls({
        boardPublicId,
        attachmentPublicIds: [attachmentPublicId],
        width: 320,
      });

    expect(assertPermission).toHaveBeenCalledTimes(1);
    expect(assertPermission).toHaveBeenCalledWith(
      mockDb,
      "user-123",
      2,
      "board:view",
    );
  });
});
