import { describe, expect, it } from "vitest";

import { CreateFeedbackSchema } from "../create-feedback.dto.js";

describe("CreateFeedbackSchema", () => {
  it("accepts a valid payload", () => {
    const result = CreateFeedbackSchema.safeParse({
      feedback: "more filters please",
      url: "https://kan.bn/boards/1",
    });

    expect(result.success).toBe(true);
  });

  it.each([
    ["empty feedback", { feedback: "", url: "https://kan.bn" }],
    ["empty url", { feedback: "hi", url: "" }],
    ["missing url", { feedback: "hi" }],
  ])("rejects %s", (_name, payload) => {
    expect(CreateFeedbackSchema.safeParse(payload).success).toBe(false);
  });
});
