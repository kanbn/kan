import { t } from "@lingui/core/macro";
import { useMutation } from "@tanstack/react-query";
import { useRef } from "react";

import {
  duplicateCard,
  toggleCardLabel,
  toggleCardMember,
} from "@kan/api-client/hooks";

import type { BoardCard } from "./types";
import type { BoardDetail, BoardQueryParams } from "~/utils/boardCache";
import { usePopup } from "~/providers/popup";
import { useBoardCache } from "~/utils/boardCache";
import { useCardCache } from "~/utils/cardCache";
import { invalidateCard } from "~/utils/cardInvalidation";
import { updateCardFromInput } from "~/utils/cardMutations";
import {
  moveCardToTop,
  toggleByPublicId,
  updateCardOnBoard,
} from "./boardUpdates";

interface CardInput {
  cardPublicId: string;
}

export function useCardQuickActions(queryParams: BoardQueryParams) {
  const boardCache = useBoardCache();
  const cardCache = useCardCache();
  const { showPopup } = usePopup();
  const inFlight = useRef(0);

  const options = <T extends CardInput>(
    update: (board: BoardDetail, input: T) => BoardDetail,
  ) => ({
    onMutate: async (input: T) => {
      inFlight.current++;
      await boardCache.cancel(queryParams.boardPublicId);
      const previous = boardCache.getData(queryParams);
      boardCache.setData(queryParams, (board) => board && update(board, input));
      return { previous };
    },
    onError: (
      _error: Error,
      _input: T,
      context?: { previous?: BoardDetail },
    ) => {
      boardCache.setData(queryParams, context?.previous);
      showPopup({
        header: t`Unable to update card`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async (
      _data: unknown,
      _error: Error | null,
      { cardPublicId }: T,
    ) => {
      // A refetch while another change is in flight would undo it on screen.
      const isLast = --inFlight.current === 0;
      await Promise.all([
        invalidateCard(cardCache, cardPublicId),
        isLast && boardCache.invalidate(queryParams.boardPublicId),
      ]);
    },
  });

  const toggleLabel = useMutation({
    mutationFn: ({
      cardPublicId,
      label,
    }: CardInput & { label: BoardCard["labels"][number] }) =>
      toggleCardLabel(cardPublicId, label.publicId),
    ...options<CardInput & { label: BoardCard["labels"][number] }>(
      (board, { cardPublicId, label }) =>
        updateCardOnBoard(board, cardPublicId, (card) => ({
          ...card,
          labels: toggleByPublicId(card.labels, label),
        })),
    ),
  });

  const toggleMember = useMutation({
    mutationFn: ({
      cardPublicId,
      member,
    }: CardInput & { member: BoardCard["members"][number] }) =>
      toggleCardMember(cardPublicId, member.publicId),
    ...options<CardInput & { member: BoardCard["members"][number] }>(
      (board, { cardPublicId, member }) =>
        updateCardOnBoard(board, cardPublicId, (card) => ({
          ...card,
          members: toggleByPublicId(card.members, member),
        })),
    ),
  });

  const setDueDate = useMutation({
    mutationFn: (input: CardInput & { dueDate: Date | null }) =>
      updateCardFromInput(input),
    ...options<CardInput & { dueDate: Date | null }>(
      (board, { cardPublicId, dueDate }) =>
        updateCardOnBoard(board, cardPublicId, (card) => ({
          ...card,
          dueDate: dueDate?.toISOString() ?? null,
        })),
    ),
  });

  const moveToList = useMutation({
    mutationFn: ({
      cardPublicId,
      listPublicId,
    }: CardInput & { listPublicId: string }) =>
      updateCardFromInput({ cardPublicId, listPublicId, index: 0 }),
    ...options<CardInput & { listPublicId: string }>(
      (board, { cardPublicId, listPublicId }) =>
        moveCardToTop(board, cardPublicId, listPublicId),
    ),
  });

  const duplicate = useMutation({
    mutationFn: ({
      cardPublicId,
      listPublicId,
      index,
    }: CardInput & { listPublicId: string; index: number }) =>
      duplicateCard(cardPublicId, {
        listPublicId,
        index,
        copyLabels: true,
        copyMembers: true,
        copyChecklists: true,
      }),
    ...options<CardInput & { listPublicId: string; index: number }>(
      (board) => board,
    ),
    onSuccess: () =>
      showPopup({
        header: t`Card duplicated`,
        message: t`Card duplicated successfully.`,
        icon: "success",
      }),
  });

  return { toggleLabel, toggleMember, setDueDate, moveToList, duplicate };
}
