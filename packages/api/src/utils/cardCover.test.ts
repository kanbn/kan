import { describe, expect, it } from "vitest";

import { formatCardCover } from "./cardCover";

describe("card cover formatting", () => {
  it("formats an attachment cover without exposing storage metadata", () => {
    expect(
      formatCardCover({
        coverColourCode: null,
        coverAttachment: { publicId: "attachment01" },
        coverSize: "normal",
      }),
    ).toEqual({
      kind: "attachment",
      attachmentPublicId: "attachment01",
      size: "normal",
    });
  });

  it("formats a colour cover", () => {
    expect(
      formatCardCover({
        coverColourCode: "#0d9488",
        coverAttachment: null,
        coverSize: "full",
      }),
    ).toEqual({
      kind: "colour",
      colourCode: "#0d9488",
      size: "full",
    });
  });

  it("returns null for an uncovered card", () => {
    expect(
      formatCardCover({
        coverColourCode: null,
        coverAttachment: null,
        coverSize: "normal",
      }),
    ).toBeNull();
  });
});
