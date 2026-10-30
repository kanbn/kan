export type CardCoverSize = "normal" | "full";

export function formatCardCover(card: {
  coverColourCode: string | null;
  coverAttachment?: { publicId: string } | null;
  coverSize: CardCoverSize;
}) {
  if (card.coverAttachment)
    return {
      kind: "attachment" as const,
      attachmentPublicId: card.coverAttachment.publicId,
      size: card.coverSize,
    };

  if (!card.coverColourCode) return null;

  return {
    kind: "colour" as const,
    colourCode: card.coverColourCode,
    size: card.coverSize,
  };
}
