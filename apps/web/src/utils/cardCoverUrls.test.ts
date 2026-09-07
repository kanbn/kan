import { describe, expect, it } from "vitest";

import {
  getCardCoverImageAttributes,
  getNextCardCoverUrlBatch,
} from "./cardCoverUrls";

describe("card cover URLs", () => {
  it("keeps visible unresolved covers in order", () => {
    expect(
      getNextCardCoverUrlBatch(
        ["attachment-1", "attachment-2", "attachment-3"],
        {
          "attachment-1": [
            { width: 320, url: "https://example.com/cover.webp" },
          ],
          "attachment-2": [],
        },
      ),
    ).toEqual(["attachment-3"]);
  });

  it("limits each request to the API batch size", () => {
    const publicIds = Array.from(
      { length: 51 },
      (_, index) => `attachment-${index}`,
    );

    expect(getNextCardCoverUrlBatch(publicIds, {})).toEqual(
      publicIds.slice(0, 50),
    );
  });

  it("builds responsive image attributes in ascending width order", () => {
    expect(
      getCardCoverImageAttributes([
        { width: 640, url: "https://example.com/cover-640.webp" },
        { width: 320, url: "https://example.com/cover-320.webp" },
      ]),
    ).toEqual({
      src: "https://example.com/cover-640.webp",
      srcSet:
        "https://example.com/cover-320.webp 320w, https://example.com/cover-640.webp 640w",
    });
  });

  it("returns no image attributes without a prepared preview", () => {
    expect(getCardCoverImageAttributes([])).toBeNull();
    expect(getCardCoverImageAttributes(undefined)).toBeNull();
  });
});
