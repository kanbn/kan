export type CardCoverSize = "normal" | "full";

export function formatCardCover(card: {
  coverColourCode: string | null;
  coverSize: CardCoverSize;
}) {
  if (!card.coverColourCode) return null;

  return {
    kind: "colour" as const,
    colourCode: card.coverColourCode,
    size: card.coverSize,
  };
}
