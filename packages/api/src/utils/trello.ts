const trelloLabelColours: Record<string, string> = {
  green: "#4bce97",
  yellow: "#f5cd47",
  orange: "#fea362",
  red: "#f87168",
  purple: "#9f8fef",
  blue: "#579dff",
  sky: "#6cc3e0",
  lime: "#94c748",
  pink: "#e774bb",
  black: "#8590a2",
  green_dark: "#1f845a",
  yellow_dark: "#946f00",
  orange_dark: "#c25100",
  red_dark: "#c9372c",
  purple_dark: "#6e5dc6",
  blue_dark: "#0c66e4",
  sky_dark: "#227d9b",
  lime_dark: "#5b7f24",
  pink_dark: "#ae4787",
  black_dark: "#626f86",
  green_light: "#baf3db",
  yellow_light: "#f8e6a0",
  orange_light: "#fedec8",
  red_light: "#ffd5d2",
  purple_light: "#dfd8fd",
  blue_light: "#cce0ff",
  sky_light: "#c6edfb",
  lime_light: "#d3f1a7",
  pink_light: "#fdd0ec",
  black_light: "#dcdfe4",
};

const defaultLabelColour = "#0d9488";
const colourlessLabelColour = "#8590a2";
const hexColourPattern = /^#[0-9A-Fa-f]{6}$/;

interface TrelloBoardBackgroundPrefs {
  backgroundColor?: string | null;
  backgroundImage?: string | null;
  backgroundImageScaled?:
    | {
        width: number;
        height: number;
        url: string;
      }[]
    | null;
}

export type TrelloBoardBackground =
  | {
      kind: "colour";
      colourCode: string;
    }
  | {
      kind: "image";
      url: string;
      fallbackColourCode: string | null;
    }
  | null;

export const getTrelloLabelColour = (colour: string | null | undefined) => {
  if (!colour) return colourlessLabelColour;

  return trelloLabelColours[colour] ?? defaultLabelColour;
};

export const getTrelloBoardBackground = (
  prefs: TrelloBoardBackgroundPrefs | null | undefined,
): TrelloBoardBackground => {
  if (!prefs) return null;

  const colourCode =
    prefs.backgroundColor && hexColourPattern.test(prefs.backgroundColor)
      ? prefs.backgroundColor
      : null;
  const rendition = [...(prefs.backgroundImageScaled ?? [])]
    .filter(
      (item) =>
        item.url &&
        Number.isFinite(item.width) &&
        item.width > 0 &&
        Number.isFinite(item.height) &&
        item.height > 0,
    )
    .sort(
      (left, right) => right.width * right.height - left.width * left.height,
    )
    .at(0);
  const imageUrl = rendition?.url ?? prefs.backgroundImage;

  if (imageUrl)
    return {
      kind: "image",
      url: imageUrl,
      fallbackColourCode: colourCode,
    };

  return colourCode ? { kind: "colour", colourCode } : null;
};
