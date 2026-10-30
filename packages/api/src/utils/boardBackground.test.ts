import { describe, expect, it } from "vitest";

import { formatBoardBackground } from "./boardBackground";

describe("formatBoardBackground", () => {
  it("formats a colour background", () => {
    expect(
      formatBoardBackground({
        backgroundColourCode: "#0d9488",
        backgroundImageKey: null,
      }),
    ).toEqual({ kind: "colour", colourCode: "#0d9488" });
  });

  it("does not expose the stored image key", () => {
    const background = formatBoardBackground({
      backgroundColourCode: "#0d9488",
      backgroundImageKey: "workspace/board/background.webp",
    });

    expect(background).toEqual({
      kind: "image",
      version: "593e39a6935f94ea",
    });
    expect(JSON.stringify(background)).not.toContain("workspace");
    expect(
      formatBoardBackground({
        backgroundColourCode: null,
        backgroundImageKey: "workspace/board/replacement.webp",
      }),
    ).not.toEqual(background);
  });

  it("returns null when the board has no background", () => {
    expect(
      formatBoardBackground({
        backgroundColourCode: null,
        backgroundImageKey: null,
      }),
    ).toBeNull();
  });
});
