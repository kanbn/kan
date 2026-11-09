import type { TestingModule } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FeedbackService } from "../../../feedback/feedback.service.js";
import { FeedbackTools } from "../feedback.tools.js";

const mockFeedbackService = { create: vi.fn() };
const user = { id: "user_1", email: "henry@kan.bn" };

let tools: FeedbackTools;

beforeEach(async () => {
  vi.clearAllMocks();

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      FeedbackTools,
      { provide: FeedbackService, useValue: mockFeedbackService },
    ],
  }).compile();

  tools = module.get(FeedbackTools);
});

describe("FeedbackTools", () => {
  it("passes the authenticated MCP user's id and the args through to the service", async () => {
    mockFeedbackService.create.mockResolvedValue({ success: true });

    const result = await tools.submitFeedback(
      { feedback: "more filters please", url: "https://kan.bn/boards/1" },
      undefined,
      { user },
    );

    expect(result).toEqual({ success: true });
    expect(mockFeedbackService.create).toHaveBeenCalledWith({
      feedback: "more filters please",
      url: "https://kan.bn/boards/1",
      userId: "user_1",
    });
  });

  it("rejects when the MCP request has no authenticated user", async () => {
    await expect(
      tools.submitFeedback(
        { feedback: "more filters please", url: "https://kan.bn/boards/1" },
        undefined,
        undefined,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(mockFeedbackService.create).not.toHaveBeenCalled();
  });
});
