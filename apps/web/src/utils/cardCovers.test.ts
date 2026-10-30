import { describe, expect, it } from "vitest";

import { colours } from "@kan/shared/constants";

import { getContrastingTextColour } from "./cardCovers";

describe("getContrastingTextColour", () => {
  it("uses light text on dark colours", () => {
    expect(getContrastingTextColour("#000000")).toBe("#ffffff");
  });

  it("uses dark text on light colours", () => {
    expect(getContrastingTextColour("#ffffff")).toBe("#000000");
  });

  it("returns a contrast colour for every shared palette entry", () => {
    for (const colour of colours) {
      expect(["#000000", "#ffffff"]).toContain(
        getContrastingTextColour(colour.code),
      );
    }
  });
});
