import { describe, expect, it } from "vitest";

import { getBoardReturnUrl } from "./board-return-url";

describe("getBoardReturnUrl", () => {
  const boardUrl = "/boards/board123456";

  it("preserves the board query", () => {
    expect(
      getBoardReturnUrl(
        "/boards/board123456?members=member123456&labels=label123456",
        boardUrl,
      ),
    ).toBe("/boards/board123456?members=member123456&labels=label123456");
  });

  it("supports template boards", () => {
    expect(
      getBoardReturnUrl(
        "/templates/board123456?members=member123456",
        "/templates/board123456",
      ),
    ).toBe("/templates/board123456?members=member123456");
  });

  it.each([
    undefined,
    ["/boards/board123456?members=member123456"],
    "https://example.com/boards/board123456?members=member123456",
    "//example.com/boards/board123456?members=member123456",
    "//localhost/boards/board123456?members=member123456",
    "/boards/anotherboard?members=member123456",
    "/boards/board123456/another-path?members=member123456",
    "/templates/board123456?members=member123456",
  ])("falls back for an unrelated or invalid return URL: %s", (returnUrl) => {
    expect(getBoardReturnUrl(returnUrl, boardUrl)).toBe(boardUrl);
  });
});
