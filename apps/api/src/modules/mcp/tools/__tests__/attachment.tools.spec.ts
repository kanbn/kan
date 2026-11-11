import type { TestingModule } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AttachmentService } from "../../../attachment/attachment.service.js";
import { AttachmentTools } from "../attachment.tools.js";

const mockAttachmentService = { delete: vi.fn() };
const user = { id: "user_1", email: "henry@kan.bn" };

let tools: AttachmentTools;

beforeEach(async () => {
  vi.clearAllMocks();

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      AttachmentTools,
      { provide: AttachmentService, useValue: mockAttachmentService },
    ],
  }).compile();

  tools = module.get(AttachmentTools);
});

describe("AttachmentTools", () => {
  it("passes the authenticated MCP user's id and args through to deleteAttachment", async () => {
    mockAttachmentService.delete.mockResolvedValue({ success: true });

    const result = await tools.deleteAttachment(
      { attachmentPublicId: "attachment_1" },
      undefined,
      { user },
    );

    expect(result).toEqual({ success: true });
    expect(mockAttachmentService.delete).toHaveBeenCalledWith({
      attachmentPublicId: "attachment_1",
      userId: "user_1",
    });
  });

  it("rejects requests without an authenticated MCP user", async () => {
    await expect(
      tools.deleteAttachment(
        { attachmentPublicId: "attachment_1" },
        undefined,
        undefined,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
