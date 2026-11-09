import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FeedbackController } from "../feedback.controller.js";
import { FeedbackService } from "../feedback.service.js";

const mockFeedbackService = { create: vi.fn() };
const user = { id: "user_1", email: "henry@kan.bn" };

let controller: FeedbackController;

beforeEach(async () => {
  vi.clearAllMocks();

  const module: TestingModule = await Test.createTestingModule({
    controllers: [FeedbackController],
    providers: [{ provide: FeedbackService, useValue: mockFeedbackService }],
  }).compile();

  controller = module.get(FeedbackController);
});

describe("FeedbackController", () => {
  it("passes the current user's id and the body through to the service", async () => {
    mockFeedbackService.create.mockResolvedValue({ success: true });

    const result = await controller.create(
      user as never,
      {
        feedback: "more filters please",
        url: "https://kan.bn/boards/1",
      } as never,
    );

    expect(result).toEqual({ success: true });
    expect(mockFeedbackService.create).toHaveBeenCalledWith({
      feedback: "more filters please",
      url: "https://kan.bn/boards/1",
      userId: "user_1",
    });
  });
});
