import type { NextApiRequest, NextApiResponse } from "next";
import { describe, expect, it, vi } from "vitest";

import * as cardAttachmentRepo from "@kan/db/repository/cardAttachment.repo";
import { assertBoardAccess } from "@kan/server/utils/permissions";

import handler from "../pages/api/upload/attachment";

vi.mock("~/env", () => ({ env: { NEXT_PUBLIC_ATTACHMENTS_BUCKET_NAME: "b" } }));
vi.mock("@kan/server/context", () => ({
  createNextApiContext: vi
    .fn()
    .mockResolvedValue({ user: { id: "u1" }, db: {} }),
}));
vi.mock("@kan/server/utils/rateLimit", () => ({
  withRateLimit: (_options: unknown, handler: unknown) => handler,
}));
vi.mock("@kan/server/utils/apiLogging", () => ({
  withApiLogging: (handler: unknown) => handler,
}));
vi.mock("@kan/server/utils/permissions", () => ({
  assertPermission: vi.fn(),
  assertBoardAccess: vi.fn(),
}));
vi.mock("@kan/db/repository/card.repo", () => ({
  getWorkspaceAndCardIdByCardPublicId: vi.fn().mockResolvedValue({
    id: 1,
    workspaceId: 2,
    boardId: 3,
    boardType: "regular",
  }),
}));
vi.mock("@kan/db/repository/cardAttachment.repo", () => ({ create: vi.fn() }));
vi.mock("@kan/db/repository/cardActivity.repo", () => ({ create: vi.fn() }));
vi.mock("@aws-sdk/lib-storage", () => ({ Upload: vi.fn() }));
vi.mock("@kan/shared/utils", () => ({
  createS3Client: vi.fn(),
  generateUID: () => "uid",
}));

describe("POST /api/upload/attachment", () => {
  it("rejects uploads to cards on boards the user can't access", async () => {
    vi.mocked(assertBoardAccess).mockRejectedValueOnce(new Error("no access"));
    const req = {
      method: "POST",
      query: { cardPublicId: "card12345678" },
      headers: { "content-type": "text/plain", "content-length": "5" },
    };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

    await handler(
      req as unknown as NextApiRequest,
      res as unknown as NextApiResponse,
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(vi.mocked(cardAttachmentRepo.create)).not.toHaveBeenCalled();
  });
});
