import { describe, expect, it } from "vitest";

import { getHeroLists, HERO_LISTS, HERO_STEPS } from "./hero-board-data";

const cardsOf = (lists: typeof HERO_LISTS) =>
  lists.flatMap(({ cards }) => cards);

describe("hero board steps", () => {
  it("keeps every card, with unique ids, at every step", () => {
    const ids = cardsOf(HERO_LISTS)
      .map(({ id }) => id)
      .sort();
    expect(new Set(ids).size).toBe(ids.length);
    for (let count = 0; count <= HERO_STEPS.length; count++) {
      const cards = cardsOf(getHeroLists(count));
      expect(cards.map(({ id }) => id).sort()).toEqual(ids);
      for (const { summary } of cards)
        expect(summary.completedChecklistItemCount).toBeLessThanOrEqual(
          summary.checklistItemCount,
        );
    }
  });

  it("never has more cards than fit in a list", () => {
    for (let count = 0; count <= HERO_STEPS.length; count++)
      for (const { cards } of getHeroLists(count))
        expect(cards.length).toBeLessThanOrEqual(5);
  });

  it("changes something at every step", () => {
    for (let count = 1; count <= HERO_STEPS.length; count++)
      expect(getHeroLists(count)).not.toEqual(getHeroLists(count - 1));
  });
});
