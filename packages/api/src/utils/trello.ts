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

interface TrelloCoverAttachment {
  id: string;
  name: string;
  url: string;
  bytes?: number | null;
  isUpload?: boolean;
}

interface TrelloCoverRendition {
  url: string;
  bytes?: number | null;
  width: number;
  height: number;
}

interface TrelloCardCoverData {
  id: string;
  idAttachmentCover?: string | null;
  attachments?: TrelloCoverAttachment[];
  cover?: {
    idUploadedBackground?: string | null;
    scaled?: TrelloCoverRendition[] | null;
  } | null;
}

export const trelloCardFields = [
  "id",
  "name",
  "desc",
  "idList",
  "labels",
  "idChecklists",
  "cover",
  "idAttachmentCover",
] as const;

export const getTrelloLabelColour = (colour: string | null | undefined) => {
  if (!colour) return colourlessLabelColour;

  return trelloLabelColours[colour] ?? defaultLabelColour;
};

export const getTrelloCoverColour = (colour: string | null | undefined) => {
  if (!colour) return null;

  return trelloLabelColours[colour] ?? null;
};

export const getTrelloCardCoverSource = (card: TrelloCardCoverData) => {
  if (card.idAttachmentCover) {
    const attachment = card.attachments?.find(
      (item) => item.id === card.idAttachmentCover,
    );
    if (attachment?.isUpload === true && attachment.name && attachment.url)
      return {
        kind: "attachment" as const,
        cardId: card.id,
        attachmentId: attachment.id,
        url: attachment.url,
        name: attachment.name,
        bytes: attachment.bytes,
      };
  }

  if (card.cover?.idUploadedBackground) {
    const rendition = [...(card.cover.scaled ?? [])]
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

    if (rendition)
      return {
        kind: "uploaded-background" as const,
        backgroundId: card.cover.idUploadedBackground,
        url: rendition.url,
        name:
          rendition.url.split("/").filter(Boolean).at(-1) ??
          "trello-background",
        bytes: rendition.bytes,
      };
  }

  return null;
};
