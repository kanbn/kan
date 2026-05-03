export const cardTypes = [
  "spike",
  "research",
  "coding",
  "analyze",
  "bug",
  "feedback",
  "suggestion",
] as const;

export type CardType = (typeof cardTypes)[number];

export const defaultCardType: CardType = "coding";
