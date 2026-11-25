import { describe, expect, it } from "vitest";

import type { BoardDetail } from "../../utils/boardCache";
import {
  moveCardToTop,
  toggleByPublicId,
  updateCardOnBoard,
} from "./boardUpdates";

const board = {
  lists: [
    {
      publicId: "a",
      cards: ["1", "2", "3"].map((publicId, index) => ({ publicId, index })),
    },
    { publicId: "b", cards: [{ publicId: "4", index: 0 }] },
  ],
} as unknown as BoardDetail;

const layout = (result: BoardDetail) =>
  result.lists.map((list) => list.cards.map((c) => `${c.publicId}@${c.index}`));

describe("moveCardToTop", () => {
  it("moves to the top of another list and renumbers both", () => {
    expect(layout(moveCardToTop(board, "2", "b"))).toEqual([
      ["1@0", "3@1"],
      ["2@0", "4@1"],
    ]);
  });

  it("leaves the board alone when the card isn't on it", () => {
    expect(moveCardToTop(board, "missing", "b")).toBe(board);
  });

  it("doesn't change the original board", () => {
    moveCardToTop(board, "1", "b");
    expect(layout(board)).toEqual([["1@0", "2@1", "3@2"], ["4@0"]]);
  });
});

describe("updateCardOnBoard", () => {
  it("only changes the given card", () => {
    const result = updateCardOnBoard(board, "4", (card) => ({
      ...card,
      title: "New",
    }));
    expect(result.lists[1]?.cards[0]?.title).toBe("New");
    expect(result.lists[0]?.cards[0]?.title).toBeUndefined();
  });
});

describe("toggleByPublicId", () => {
  it("adds a missing item and removes a present one", () => {
    const x = { publicId: "x" };
    expect(toggleByPublicId([], x)).toEqual([x]);
    expect(toggleByPublicId([x], { publicId: "x" })).toEqual([]);
  });
});
