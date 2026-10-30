import { createHash } from "node:crypto";

export const formatBoardBackground = (board: {
  backgroundColourCode: string | null;
  backgroundImageKey: string | null;
}) => {
  if (board.backgroundImageKey) {
    return {
      kind: "image" as const,
      version: createHash("sha256")
        .update(board.backgroundImageKey)
        .digest("hex")
        .slice(0, 16),
    };
  }

  if (board.backgroundColourCode) {
    return {
      kind: "colour" as const,
      colourCode: board.backgroundColourCode,
    };
  }

  return null;
};
