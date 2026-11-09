import { InternalServerErrorException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import * as feedbackRepo from "@kan/db/repository/feedback.repo";

import { FeedbackService } from "../feedback.service.js";

describe("FeedbackService", () => {
  it("returns success when the repository insert succeeds", async () => {
    vi.spyOn(feedbackRepo, "create").mockResolvedValueOnce({ id: 1 });

    const service = new FeedbackService();
    const result = await service.create({
      feedback: "more filters please",
      url: "https://kan.bn/boards/1",
      userId: "user_1",
    });

    expect(result).toEqual({ success: true });
  });

  it("throws when the repository insert returns nothing", async () => {
    vi.spyOn(feedbackRepo, "create").mockResolvedValueOnce(undefined);

    const service = new FeedbackService();
    await expect(
      service.create({
        feedback: "more filters please",
        url: "https://kan.bn/boards/1",
        userId: "user_1",
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
