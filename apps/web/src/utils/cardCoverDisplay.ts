export const cardCoverDisplayOptions = [
  "prominent",
  "subdued",
  "hidden",
] as const;

export type CardCoverDisplay = (typeof cardCoverDisplayOptions)[number];

export function parseCardCoverDisplay(value: string | null): CardCoverDisplay {
  return (
    cardCoverDisplayOptions.find((option) => option === value) ?? "prominent"
  );
}
