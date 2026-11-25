import type { BoardCard, BoardList } from "./types";
import type { BoardDetail } from "~/utils/boardCache";

export interface CardInList {
  card: BoardCard;
  list: BoardList;
}

export const findCardInList = (
  board: BoardDetail,
  cardPublicId: string,
): CardInList | undefined => {
  for (const list of board.lists) {
    const card = list.cards.find(({ publicId }) => publicId === cardPublicId);
    if (card) return { card, list };
  }
};

export const updateCardOnBoard = (
  board: BoardDetail,
  cardPublicId: string,
  update: (card: BoardCard) => BoardCard,
): BoardDetail => ({
  ...board,
  lists: board.lists.map((list) => ({
    ...list,
    cards: list.cards.map((card) =>
      card.publicId === cardPublicId ? update(card) : card,
    ),
  })),
});

const withIndexes = (cards: BoardCard[]) =>
  cards.map((card, index) => ({ ...card, index }));

export const moveCardToTop = (
  board: BoardDetail,
  cardPublicId: string,
  listPublicId: string,
): BoardDetail => {
  const card = findCardInList(board, cardPublicId)?.card;
  if (!card) return board;

  return {
    ...board,
    lists: board.lists.map((list) => {
      const rest = list.cards.filter((c) => c.publicId !== cardPublicId);
      if (list.publicId === listPublicId)
        return { ...list, cards: withIndexes([card, ...rest]) };
      return rest.length === list.cards.length
        ? list
        : { ...list, cards: withIndexes(rest) };
    }),
  };
};

export const toggleByPublicId = <T extends { publicId: string }>(
  items: T[],
  item: T,
) =>
  items.some(({ publicId }) => publicId === item.publicId)
    ? items.filter(({ publicId }) => publicId !== item.publicId)
    : [...items, item];
