import { describe, expect, it } from "vitest";

import { getTrelloBoardBackground, getTrelloLabelColour } from "./trello";

describe("getTrelloLabelColour", () => {
  it.each([
    ["green", "#4bce97"],
    ["yellow", "#f5cd47"],
    ["orange", "#fea362"],
    ["red", "#f87168"],
    ["purple", "#9f8fef"],
    ["blue", "#579dff"],
    ["sky", "#6cc3e0"],
    ["lime", "#94c748"],
    ["pink", "#e774bb"],
    ["black", "#8590a2"],
    ["green_dark", "#1f845a"],
    ["yellow_dark", "#946f00"],
    ["orange_dark", "#c25100"],
    ["red_dark", "#c9372c"],
    ["purple_dark", "#6e5dc6"],
    ["blue_dark", "#0c66e4"],
    ["sky_dark", "#227d9b"],
    ["lime_dark", "#5b7f24"],
    ["pink_dark", "#ae4787"],
    ["black_dark", "#626f86"],
    ["green_light", "#baf3db"],
    ["yellow_light", "#f8e6a0"],
    ["orange_light", "#fedec8"],
    ["red_light", "#ffd5d2"],
    ["purple_light", "#dfd8fd"],
    ["blue_light", "#cce0ff"],
    ["sky_light", "#c6edfb"],
    ["lime_light", "#d3f1a7"],
    ["pink_light", "#fdd0ec"],
    ["black_light", "#dcdfe4"],
  ])("maps Trello colour %s to %s", (colour, expected) => {
    expect(getTrelloLabelColour(colour)).toBe(expected);
  });

  it.each([null, undefined, ""])(
    "uses a neutral colour for a colourless Trello label",
    (colour) => {
      expect(getTrelloLabelColour(colour)).toBe("#8590a2");
    },
  );

  it("uses the default Kan colour for an unknown Trello colour", () => {
    expect(getTrelloLabelColour("future_colour")).toBe("#0d9488");
  });
});

describe("getTrelloBoardBackground", () => {
  it("selects the largest scaled image rendition", () => {
    expect(
      getTrelloBoardBackground({
        backgroundColor: "#0B50AF",
        backgroundImage: "https://example.com/original.jpg",
        backgroundImageScaled: [
          {
            width: 480,
            height: 320,
            url: "https://example.com/480.jpg",
          },
          {
            width: 1920,
            height: 1080,
            url: "https://example.com/1920.jpg",
          },
          {
            width: 960,
            height: 640,
            url: "https://example.com/960.jpg",
          },
        ],
      }),
    ).toEqual({
      kind: "image",
      url: "https://example.com/1920.jpg",
      fallbackColourCode: "#0B50AF",
    });
  });

  it("uses the original image when no scaled rendition is available", () => {
    expect(
      getTrelloBoardBackground({
        backgroundImage: "https://example.com/original.jpg",
        backgroundImageScaled: [],
      }),
    ).toEqual({
      kind: "image",
      url: "https://example.com/original.jpg",
      fallbackColourCode: null,
    });
  });

  it("retains an arbitrary valid Trello colour", () => {
    expect(getTrelloBoardBackground({ backgroundColor: "#EF763A" })).toEqual({
      kind: "colour",
      colourCode: "#EF763A",
    });
  });

  it("ignores malformed and empty background preferences", () => {
    expect(getTrelloBoardBackground({ backgroundColor: "orange" })).toBeNull();
    expect(getTrelloBoardBackground(undefined)).toBeNull();
  });
});
