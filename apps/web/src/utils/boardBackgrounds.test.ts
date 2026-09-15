import { describe, expect, it } from "vitest";

import {
  getBoardBackgroundImageAttributes,
  getNextBoardBackgroundUrlBatch,
} from "./boardBackgrounds";

describe("getNextBoardBackgroundUrlBatch", () => {
  it("skips resolved boards and bounds the batch", () => {
    expect(
      getNextBoardBackgroundUrlBatch(
        ["board-a", "board-b", "board-c"],
        { "board-b": null },
        1,
      ),
    ).toEqual(["board-a"]);
  });
});

describe("getBoardBackgroundImageAttributes", () => {
  it("sorts previews and uses the largest preview as the fallback", () => {
    expect(
      getBoardBackgroundImageAttributes([
        { width: 1920, url: "large" },
        { width: 480, url: "small" },
        { width: 960, url: "medium" },
      ]),
    ).toEqual({
      src: "large",
      srcSet: "small 480w, medium 960w, large 1920w",
    });
  });

  it("returns null when no preview is available", () => {
    expect(getBoardBackgroundImageAttributes(undefined)).toBeNull();
    expect(getBoardBackgroundImageAttributes([])).toBeNull();
  });
});
