import { describe, expect, it } from "vitest";

import { getNextCardCoverUrlBatch } from "./cardCoverUrls";

describe("getNextCardCoverUrlBatch", () => {
  it("keeps visible unresolved covers in order", () => {
    expect(
      getNextCardCoverUrlBatch(
        ["attachment-1", "attachment-2", "attachment-3"],
        {
          "attachment-1": "https://example.com/cover.webp",
          "attachment-2": null,
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
});
