import { describe, expect, it } from "vitest";

import { colours } from "@kan/shared/constants";

import { resolveLabelColour } from "./labelColours";

describe("resolveLabelColour", () => {
  it("returns the matching palette colour", () => {
    expect(resolveLabelColour(colours[1]?.code)).toEqual(colours[1]);
  });

  it("preserves a custom colour", () => {
    expect(resolveLabelColour("#4bce97")).toEqual({
      name: "#4bce97",
      code: "#4bce97",
    });
  });

  it("uses the default colour when no colour is stored", () => {
    expect(resolveLabelColour(null)).toEqual(colours[0]);
    expect(resolveLabelColour(undefined)).toEqual(colours[0]);
  });
});
