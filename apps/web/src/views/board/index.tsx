import type {
  CollisionDetection,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  UniqueIdentifier,
} from "@dnd-kit/core";
import { useParams } from "next/navigation";
import { useRouter } from "next/router";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { t } from "@lingui/core/macro";
import { keepPreviousData, useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import {
  HiOutlinePlusSmall,
  HiOutlineRectangleStack,
  HiOutlineSquare3Stack3D,
} from "react-icons/hi2";

import {
  useGetBoard,
  useUpdateBoard,
  useUpdateList,
} from "@kan/api-client/hooks";
import { env } from "@kan/shared/env";

import type { BoardView } from "./components/ViewToggle";
import type { DragData } from "./dnd/types";
import type { BoardCard, BoardList } from "./types";
import Button from "~/components/Button";
import { DeleteLabelConfirmation } from "~/components/DeleteLabelConfirmation";
import { LabelForm } from "~/components/LabelForm";
import Modal from "~/components/modal";
import { NewWorkspaceForm } from "~/components/NewWorkspaceForm";
import { PageHead } from "~/components/PageHead";
import PatternedBackground from "~/components/PatternedBackground";
import { Tooltip } from "~/components/Tooltip";
import { EditYouTubeModal } from "~/components/YouTubeEmbed/EditYouTubeModal";
import { useBoardEvents } from "~/hooks/useBoardEvents";
import { useDragToScroll } from "~/hooks/useDragToScroll";
import { usePermissions } from "~/hooks/usePermissions";
import { useScrollRestore } from "~/hooks/useScrollRestore";
import { useKeyboardShortcut } from "~/providers/keyboard-shortcuts";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { getApiErrorStatus } from "~/utils/apiError";
import { useBoardCache } from "~/utils/boardCache";
import { updateCardFromInput } from "~/utils/cardMutations";
import { formatToArray, isPlaceholderPublicId } from "~/utils/helpers";
import { BoardLabelsModal } from "~/views/boards/components/BoardLabels";
import { DeleteCardConfirmation } from "~/views/card/components/DeleteCardConfirmation";
import { findCardInList } from "./boardUpdates";
import BoardDropdown from "./components/BoardDropdown";
import CalendarView from "./components/CalendarView";
import { CardContextMenu } from "./components/CardContextMenu";
import { CardDueDateModal } from "./components/CardDueDateModal";
import CardList from "./components/CardList";
import CardPreview from "./components/CardPreview";
import { DeleteBoardConfirmation } from "./components/DeleteBoardConfirmation";
import { DeleteListConfirmation } from "./components/DeleteListConfirmation";
import Filters from "./components/Filters";
import List from "./components/List";
import { MoveBoardForm } from "./components/MoveBoardForm";
import { NewCardForm } from "./components/NewCardForm";
import { NewListForm } from "./components/NewListForm";
import { NewTemplateForm } from "./components/NewTemplateForm";
import { UpdateBoardSlugForm } from "./components/UpdateBoardSlugForm";
import ViewToggle from "./components/ViewToggle";
import VisibilityButton from "./components/VisibilityButton";
import { createBoardCollisionDetection } from "./dnd/collision";
import { useCardQuickActions } from "./useCardQuickActions";

interface UpdateBoardInput {
  boardPublicId: string;
  name: string;
}

type PublicListId = string;

function getEventData(
  entity: { data: { current: unknown } } | null | undefined,
): DragData | undefined {
  return entity?.data.current as DragData | undefined;
}

export default function BoardPage({ isTemplate }: { isTemplate?: boolean }) {
  const params = useParams() as { boardId: string | string[] } | null;
  const router = useRouter();
  const boardCache = useBoardCache();
  const { showPopup } = usePopup();
  const { workspace, selectWorkspaceById } = useWorkspace();
  const {
    openModal,
    modalContentType,
    entityId,
    isOpen,
    modalStates,
    clearModalState,
  } = useModal();
  const [selectedPublicListId, setSelectedPublicListId] =
    useState<PublicListId>("");
  const [newCardInitialDueDate, setNewCardInitialDueDate] =
    useState<Date | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const { ref: scrollRef, onMouseDown } = useDragToScroll({
    enabled: true,
    direction: "horizontal",
  });

  const {
    canCreateList,
    canEditList,
    canEditCard,
    canEditBoard,
    canCreateCard,
  } = usePermissions();

  const boardId = params?.boardId
    ? Array.isArray(params.boardId)
      ? params.boardId[0]
      : params.boardId
    : null;
  const cardReturnQuery = router.asPath.includes("?")
    ? `?returnUrl=${encodeURIComponent(router.asPath)}`
    : "";

  const openNewListForm = useCallback(
    (publicBoardId: string) => {
      openModal("NEW_LIST");
      setSelectedPublicListId(publicBoardId);
    },
    [openModal],
  );

  const createListShortcut = useMemo(
    () => ({
      type: "PRESS" as const,
      stroke: { key: "C" },
      action: () => boardId && canCreateList && openNewListForm(boardId),
      description: t`Create new list`,
      group: "ACTIONS" as const,
    }),
    [boardId, canCreateList, openNewListForm],
  );

  const { tooltipContent: createListShortcutTooltipContent } =
    useKeyboardShortcut(createListShortcut);

  const updateBoard = useUpdateBoard();

  const { register, handleSubmit, setValue } = useForm<UpdateBoardInput>({
    values: {
      boardPublicId: boardId ?? "",
      name: "",
    },
  });

  const onSubmit = (values: UpdateBoardInput) => {
    updateBoard.mutate({
      boardPublicId: values.boardPublicId,
      data: { name: values.name },
    });
  };

  const semanticFilters = formatToArray(router.query.dueDate) as (
    | "overdue"
    | "today"
    | "tomorrow"
    | "next-week"
    | "next-month"
    | "no-due-date"
  )[];

  const boardType: "regular" | "template" = isTemplate ? "template" : "regular";

  const isFreeCloudPlan =
    env("NEXT_PUBLIC_KAN_ENV") === "cloud" && workspace.plan === "free";

  const upgradeUrl = `/upgrade/select-plan?plan=team&workspacePublicId=${workspace.publicId}&returnUrl=${encodeURIComponent(router.asPath)}`;

  const requestedView: BoardView =
    router.query.view === "calendar" ? "calendar" : "board";

  const view: BoardView = isTemplate ? "board" : requestedView;

  const handleViewChange = (nextView: BoardView) => {
    const nextQuery = { ...router.query };
    if (nextView === "calendar") {
      nextQuery.view = "calendar";
    } else {
      delete nextQuery.view;
    }

    void router.push({ pathname: router.pathname, query: nextQuery });
  };

  const queryParams = {
    boardPublicId: boardId ?? "",
    members: formatToArray(router.query.members),
    labels: formatToArray(router.query.labels),
    lists: formatToArray(router.query.lists),
    ...(semanticFilters.length > 0 && {
      dueDateFilters: semanticFilters,
    }),
    type: boardType,
    cardView: "summary" as const,
  };
  const { boardPublicId: _boardPublicId, ...boardQueryParams } = queryParams;

  const {
    data: boardData,
    isSuccess,
    isLoading: isQueryLoading,
    error,
  } = useGetBoard(queryParams.boardPublicId, boardQueryParams, {
    query: {
      enabled: !!boardId,
      placeholderData: keepPreviousData,
      retry: false,
      select: (res) => res.data,
    },
  });

  useEffect(() => {
    if (router.isReady && boardId && !isQueryLoading) {
      if (getApiErrorStatus(error) === 404 || !boardData) {
        void router.replace("/404");
      }
    }
  }, [router, boardId, isQueryLoading, error, boardData]);

  const boardWorkspacePublicId = boardData?.workspace.publicId;
  useEffect(() => {
    if (boardWorkspacePublicId) selectWorkspaceById(boardWorkspacePublicId);
  }, [boardWorkspacePublicId, selectWorkspaceById]);

  const refetchBoard = async () => {
    if (boardId) await boardCache.refetch(queryParams.boardPublicId);
  };

  useEffect(() => {
    if (boardId) {
      setIsInitialLoading(false);
    }
  }, [boardId]);

  const isLoading = isInitialLoading || isQueryLoading;

  useScrollRestore(
    boardId,
    scrollRef,
    router,
    !isLoading && (boardData?.lists.length ?? 0) > 0,
  );

  const updateListMutation = useUpdateList({
    mutation: {
      onMutate: async (args) => {
        await boardCache.cancel();

        const currentState = boardCache.getData(queryParams);

        boardCache.setData(queryParams, (oldBoard) => {
          if (!oldBoard) return oldBoard;

          const updatedLists = Array.from(oldBoard.lists);

          const sourceList = updatedLists.find(
            (list) => list.publicId === args.listPublicId,
          );

          const currentIndex = sourceList?.index;

          if (currentIndex === undefined) return oldBoard;

          const removedList = updatedLists.splice(currentIndex, 1)[0];

          if (removedList && args.data.index !== undefined) {
            updatedLists.splice(args.data.index, 0, removedList);

            return {
              ...oldBoard,
              lists: updatedLists,
            };
          }
        });

        return { previousState: currentState };
      },
      onError: (_error, _newList, context) => {
        boardCache.setData(queryParams, context?.previousState);
        showPopup({
          header: t`Unable to update list`,
          message: t`Please try again later, or contact customer support.`,
          icon: "error",
        });
      },
      onSettled: async () => {
        await boardCache.invalidate(queryParams.boardPublicId);
      },
    },
  });

  const updateCardMutation = useMutation({
    mutationFn: updateCardFromInput,
    onMutate: async (args) => {
      await boardCache.cancel();

      const currentState = boardCache.getData(queryParams);

      boardCache.setData(queryParams, (oldBoard) => {
        if (!oldBoard) return oldBoard;

        const updatedLists = Array.from(oldBoard.lists);

        const sourceList = updatedLists.find((list) =>
          list.cards.some((card) => card.publicId === args.cardPublicId),
        );
        const destinationList = updatedLists.find(
          (list) => list.publicId === args.listPublicId,
        );

        const cardToMove = sourceList?.cards.find(
          (card) => card.publicId === args.cardPublicId,
        );

        if (!cardToMove) return oldBoard;

        const removedCard = sourceList?.cards.splice(cardToMove.index, 1)[0];

        if (
          sourceList &&
          destinationList &&
          removedCard &&
          args.index !== undefined
        ) {
          destinationList.cards.splice(args.index, 0, removedCard);

          return {
            ...oldBoard,
            lists: updatedLists,
          };
        }
      });

      return { previousState: currentState };
    },
    onError: (_error, _newList, context) => {
      boardCache.setData(queryParams, context?.previousState);
      showPopup({
        header: t`Unable to update card`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      await boardCache.invalidate(queryParams.boardPublicId);
    },
  });

  const quickActions = useCardQuickActions(queryParams);
  useBoardEvents(boardId ?? undefined);

  // A label created from a card's menu is added to that card.
  const newLabelCardId = useRef<string | null>(null);
  const { toggleLabel } = quickActions;
  useEffect(() => {
    const labelPublicId = modalStates.NEW_LABEL_CREATED as string | undefined;
    if (labelPublicId && newLabelCardId.current) {
      toggleLabel.mutate({
        cardPublicId: newLabelCardId.current,
        label: { publicId: labelPublicId, name: "", colourCode: null },
      });
      clearModalState("NEW_LABEL_CREATED");
    }
    if (!isOpen) newLabelCardId.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalStates.NEW_LABEL_CREATED, isOpen]);

  const boardName = boardData?.name;
  useEffect(() => {
    if (isSuccess) {
      setValue("name", boardName || "");
    }
    // Only when the name changes, so a refetch doesn't undo one being typed.
  }, [isSuccess, boardName, setValue]);

  const openNewCardForDate = (date: Date) => {
    const targetListPublicId = boardData?.lists[0]?.publicId;
    if (!canCreateCard || !targetListPublicId || isFreeCloudPlan) return;

    setSelectedPublicListId(targetListPublicId);
    setNewCardInitialDueDate(date);
    openModal("NEW_CARD");
  };

  const handleCalendarCardDrop = (
    cardPublicId: string,
    dueDate: Date,
    onSettled: () => void,
  ) => {
    if (!canEditCard || isFreeCloudPlan) {
      onSettled();
      return;
    }
    quickActions.setDueDate.mutate({ cardPublicId, dueDate }, { onSettled });
  };

  const getCardHref = (cardPublicId: string) =>
    isTemplate
      ? `/templates/${boardId}/cards/${cardPublicId}${cardReturnQuery}`
      : `/cards/${cardPublicId}${cardReturnQuery}`;

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [activeWidth, setActiveWidth] = useState<number | null>(null);
  const [dragCardsByList, setDragCardsByList] = useState<Record<
    string,
    BoardCard[]
  > | null>(null);
  const [dragListOrder, setDragListOrder] = useState<BoardList[] | null>(null);
  const lastOverIdRef = useRef<UniqueIdentifier | null>(null);

  useEffect(() => {
    if (activeId == null) return;
    document.body.style.cursor = "grabbing";
    return () => {
      document.body.style.cursor = "";
    };
  }, [activeId]);

  const baseCardsByList = useMemo(() => {
    const map: Record<string, BoardCard[]> = {};
    boardData?.lists.forEach((list) => {
      map[list.publicId] = list.cards;
    });
    return map;
  }, [boardData]);

  const cardsByList = dragCardsByList ?? baseCardsByList;
  const lists = useMemo(
    () => dragListOrder ?? boardData?.lists ?? [],
    [dragListOrder, boardData?.lists],
  );
  // See the comment in CardList.tsx: dnd-kit disables the reflow
  // transition for a frame whenever the items array reference changes, so
  // this needs to stay stable across renders that don't actually reorder
  // the lists.
  const listIds = useMemo(() => lists.map((list) => list.publicId), [lists]);

  const collisionDetectionStrategy: CollisionDetection = useMemo(
    () => createBoardCollisionDetection(lastOverIdRef),
    [],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const canScroll = useCallback(
    (element: Element) =>
      element === scrollRef.current ||
      element.hasAttribute("data-list-scroll-id"),
    [scrollRef],
  );

  const handleDragStart = ({ active }: DragStartEvent): void => {
    setActiveId(active.id);
    setActiveWidth(active.rect.current.initial?.width ?? null);
    if (getEventData(active)?.type === "CARD") {
      setDragCardsByList(baseCardsByList);
    }
  };

  const handleDragOver = ({ active, over }: DragOverEvent): void => {
    if (!over) return;

    const activeData = getEventData(active);
    if (activeData?.type !== "CARD") return;

    const overData = getEventData(over);
    const destListPublicId =
      overData?.type === "CARD" || overData?.type === "LIST_BODY"
        ? overData.listPublicId
        : undefined;
    if (!destListPublicId) return;

    setDragCardsByList((current) => {
      const lists = current ?? baseCardsByList;
      const sourceListPublicId = Object.keys(lists).find((listId) =>
        lists[listId]?.some((card) => card.publicId === active.id),
      );

      if (!sourceListPublicId || sourceListPublicId === destListPublicId) {
        return current;
      }

      const sourceCards = lists[sourceListPublicId] ?? [];
      const activeIndex = sourceCards.findIndex(
        (card) => card.publicId === active.id,
      );
      const movedCard = sourceCards[activeIndex];
      if (!movedCard) return current;

      const destCards = lists[destListPublicId] ?? [];
      const overIndex =
        overData?.type === "CARD"
          ? destCards.findIndex((card) => card.publicId === over.id)
          : -1;

      let insertAt: number;
      if (overIndex === -1) {
        insertAt = destCards.length;
      } else {
        const overRect = over.rect;
        const isBelowOverItem =
          active.rect.current.translated &&
          active.rect.current.translated.top > overRect.top + overRect.height;
        insertAt = overIndex + (isBelowOverItem ? 1 : 0);
      }

      return {
        ...lists,
        [sourceListPublicId]: [
          ...sourceCards.slice(0, activeIndex),
          ...sourceCards.slice(activeIndex + 1),
        ],
        [destListPublicId]: [
          ...destCards.slice(0, insertAt),
          movedCard,
          ...destCards.slice(insertAt),
        ],
      };
    });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent): void => {
    setActiveId(null);
    setActiveWidth(null);
    const activeData = getEventData(active);
    const activeIdStr = String(active.id);

    if (activeData?.type === "LIST") {
      const currentLists = boardData?.lists;
      if (
        !over ||
        !canEditList ||
        isPlaceholderPublicId(activeIdStr) ||
        !currentLists
      ) {
        return;
      }
      if (getEventData(over)?.type !== "LIST") return;

      const oldIndex = currentLists.findIndex(
        (list) => list.publicId === active.id,
      );
      const newIndex = currentLists.findIndex(
        (list) => list.publicId === over.id,
      );
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      setDragListOrder(arrayMove(currentLists, oldIndex, newIndex));

      updateListMutation.mutate(
        { listPublicId: activeIdStr, data: { index: newIndex } },
        { onSettled: () => setDragListOrder(null) },
      );
      return;
    }

    if (activeData?.type === "CARD") {
      const finalLists = dragCardsByList ?? baseCardsByList;

      if (!over || !canEditCard || isPlaceholderPublicId(activeIdStr)) {
        setDragCardsByList(null);
        return;
      }

      const overData = getEventData(over);
      const destListPublicId =
        overData?.type === "CARD" || overData?.type === "LIST_BODY"
          ? overData.listPublicId
          : undefined;
      if (!destListPublicId || isPlaceholderPublicId(destListPublicId)) {
        setDragCardsByList(null);
        return;
      }

      const destCards = finalLists[destListPublicId] ?? [];
      const activeIndex = destCards.findIndex(
        (card) => card.publicId === active.id,
      );
      if (activeIndex === -1) {
        setDragCardsByList(null);
        return;
      }
      const rawOverIndex =
        overData?.type === "CARD"
          ? destCards.findIndex((card) => card.publicId === over.id)
          : -1;
      const overIndex =
        rawOverIndex === -1 ? destCards.length - 1 : rawOverIndex;

      const finalPreview = {
        ...finalLists,
        [destListPublicId]: arrayMove(destCards, activeIndex, overIndex),
      };
      const finalIndex =
        finalPreview[destListPublicId]?.findIndex(
          (card) => card.publicId === active.id,
        ) ?? overIndex;

      setDragCardsByList(finalPreview);

      updateCardMutation.mutate(
        {
          cardPublicId: activeIdStr,
          listPublicId: destListPublicId,
          index: finalIndex,
        },
        { onSettled: () => setDragCardsByList(null) },
      );
    }
  };

  const activeCard = useMemo(() => {
    if (activeId == null) return null;
    for (const cards of Object.values(cardsByList)) {
      const found = cards.find((card) => card.publicId === activeId);
      if (found) return found;
    }
    return null;
  }, [activeId, cardsByList]);

  const renderModalContent = () => {
    return (
      <>
        <Modal
          modalSize="sm"
          isVisible={isOpen && modalContentType === "DELETE_BOARD"}
        >
          <DeleteBoardConfirmation
            isTemplate={!!isTemplate}
            boardPublicId={boardId ?? ""}
          />
        </Modal>

        <Modal
          modalSize="sm"
          isVisible={isOpen && modalContentType === "DELETE_LIST"}
        >
          <DeleteListConfirmation
            listPublicId={selectedPublicListId}
            queryParams={queryParams}
          />
        </Modal>

        <Modal
          modalSize="md"
          isVisible={isOpen && modalContentType === "NEW_CARD"}
        >
          <NewCardForm
            isTemplate={!!isTemplate}
            boardData={boardData}
            listPublicId={selectedPublicListId}
            queryParams={queryParams}
            initialDueDate={newCardInitialDueDate}
          />
        </Modal>

        <Modal
          modalSize="sm"
          isVisible={isOpen && modalContentType === "NEW_LIST"}
        >
          <NewListForm
            boardPublicId={boardId ?? ""}
            queryParams={queryParams}
          />
        </Modal>

        <Modal
          modalSize="sm"
          isVisible={isOpen && modalContentType === "NEW_WORKSPACE"}
        >
          <NewWorkspaceForm />
        </Modal>

        <Modal
          modalSize="sm"
          isVisible={isOpen && modalContentType === "NEW_LABEL"}
        >
          <LabelForm boardPublicId={boardId ?? ""} refetch={refetchBoard} />
        </Modal>

        <Modal
          modalSize="sm"
          isVisible={isOpen && modalContentType === "EDIT_LABEL"}
        >
          <LabelForm
            boardPublicId={boardId ?? ""}
            refetch={refetchBoard}
            isEdit
          />
        </Modal>

        <Modal
          modalSize="sm"
          isVisible={isOpen && modalContentType === "DELETE_LABEL"}
        >
          <DeleteLabelConfirmation
            refetch={refetchBoard}
            labelPublicId={entityId}
          />
        </Modal>

        {!isTemplate && boardId && (
          <BoardLabelsModal
            boardPublicId={boardId}
            archived={boardData?.isArchived ?? false}
          />
        )}

        <Modal
          modalSize="sm"
          isVisible={isOpen && modalContentType === "UPDATE_BOARD_SLUG"}
        >
          <UpdateBoardSlugForm
            boardPublicId={boardId ?? ""}
            workspaceSlug={workspace.slug ?? ""}
            boardSlug={boardData?.slug ?? ""}
            queryParams={queryParams}
          />
        </Modal>

        <Modal
          modalSize="sm"
          isVisible={isOpen && modalContentType === "MOVE_BOARD"}
        >
          <MoveBoardForm boardPublicId={boardId ?? ""} />
        </Modal>

        <Modal
          modalSize="sm"
          isVisible={isOpen && modalContentType === "CREATE_TEMPLATE"}
        >
          <NewTemplateForm
            workspacePublicId={workspace.publicId}
            sourceBoardPublicId={boardId ?? ""}
            sourceBoardName={boardData?.name ?? ""}
          />
        </Modal>

        <Modal
          modalSize="sm"
          isVisible={isOpen && modalContentType === "EDIT_YOUTUBE"}
        >
          <EditYouTubeModal />
        </Modal>

        <Modal
          modalSize="sm"
          isVisible={isOpen && modalContentType === "CARD_DUE_DATE"}
        >
          <CardDueDateModal
            dueDate={
              boardData && findCardInList(boardData, entityId)?.card.dueDate
            }
            weekStartsOn={workspace.weekStartDay}
            onSelect={(dueDate) =>
              quickActions.setDueDate.mutate({
                cardPublicId: entityId,
                dueDate,
              })
            }
          />
        </Modal>
        <Modal
          modalSize="sm"
          isVisible={isOpen && modalContentType === "DELETE_CARD"}
        >
          <DeleteCardConfirmation
            cardPublicId={entityId}
            boardPublicId={boardId ?? ""}
            returnUrl={router.asPath}
          />
        </Modal>
      </>
    );
  };

  return (
    <>
      <PageHead
        title={`${boardData?.name ?? (isTemplate ? t`Template` : t`Board`)} | ${workspace.name}`}
      />
      <div className="relative flex h-full flex-col">
        <PatternedBackground />
        <div className="z-10 flex w-full flex-col justify-between p-6 md:flex-row md:p-8">
          {isLoading && !boardData && (
            <div className="flex h-[2.3rem] items-center">
              <div className="h-4 w-32 animate-pulse rounded bg-light-300 dark:bg-dark-300" />
            </div>
          )}
          {boardData && (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="order-2 focus-visible:outline-hidden md:order-1"
            >
              <input
                id="name"
                type="text"
                aria-label={t`Board name`}
                {...register("name")}
                onBlur={canEditBoard ? handleSubmit(onSubmit) : undefined}
                readOnly={!canEditBoard}
                className="block border-0 bg-transparent p-0 py-0 leading-[2.3rem] font-bold tracking-tight text-neutral-900 focus:ring-0 focus-visible:outline-hidden disabled:cursor-not-allowed sm:text-base dark:text-dark-1000"
              />
            </form>
          )}
          {!boardData && !isLoading && (
            <p className="order-2 block p-0 py-0 leading-[2.3rem] font-bold tracking-tight text-neutral-900 sm:text-base md:order-1 dark:text-dark-1000">
              {t`${isTemplate ? "Template" : "Board"} not found`}
            </p>
          )}
          <div className="order-1 mb-4 flex items-center justify-end space-x-1.5 sm:space-x-2 md:order-2 md:mb-0">
            {isTemplate && (
              <div className="inline-flex cursor-default items-center justify-center rounded-md border border-light-300 bg-light-50 px-3 py-2 text-xs font-semibold whitespace-nowrap text-light-950 shadow-xs dark:border-dark-300 dark:bg-dark-50 dark:text-dark-950">
                <span className="mr-2">
                  <HiOutlineRectangleStack />
                </span>
                {t`Template`}
              </div>
            )}
            {!isTemplate && (
              <>
                <VisibilityButton
                  visibility={boardData?.visibility ?? "private"}
                  boardPublicId={boardId ?? ""}
                  boardSlug={boardData?.slug ?? ""}
                  queryParams={queryParams}
                  isLoading={!boardData}
                  isAdmin={workspace.role === "admin"}
                />
                {boardData && (
                  <>
                    <ViewToggle view={view} onChange={handleViewChange} />
                    <Filters
                      labels={boardData.labels}
                      members={boardData.workspace.members.filter(
                        (member) => member.user !== null,
                      )}
                      assignedMemberPublicIds={
                        new Set(boardData.assignedMemberPublicIds)
                      }
                      lists={boardData.allLists}
                      isLoading={!boardData}
                    />
                  </>
                )}
              </>
            )}
            <Tooltip
              content={
                !canCreateList
                  ? t`You don't have permission`
                  : createListShortcutTooltipContent
              }
            >
              <Button
                size="sm"
                onClick={() => {
                  if (boardId && canCreateList) openNewListForm(boardId);
                }}
                disabled={!boardData || !canCreateList}
              >
                <span className="flex items-center gap-2">
                  <HiOutlinePlusSmall className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">{t`New list`}</span>
                </span>
              </Button>
            </Tooltip>
            <BoardDropdown
              isTemplate={!!isTemplate}
              isLoading={!boardData}
              boardPublicId={boardId ?? ""}
              isArchived={boardData?.isArchived ?? false}
              isFavorite={boardData?.favorite}
              boardName={boardData?.name}
              workspaceSlug={workspace.slug ?? ""}
              boardSlug={boardData?.slug ?? ""}
              visibility={boardData?.visibility ?? "private"}
            />
          </div>
        </div>

        <CardContextMenu
          board={boardData}
          actions={quickActions}
          getCardHref={getCardHref}
          isTemplate={!!isTemplate}
          weekStartsOn={workspace.weekStartDay}
          onCreateLabel={(cardPublicId) => {
            newLabelCardId.current = cardPublicId;
            openModal("NEW_LABEL");
          }}
          onMoved={
            view === "calendar"
              ? (listName) =>
                  showPopup({
                    header: t`Card moved`,
                    message: t`The card is now in ${listName}.`,
                    icon: "success",
                  })
              : undefined
          }
        >
          {view === "calendar" ? (
            boardData && (
              <CalendarView
                lists={boardData.lists}
                cardPrefix={boardData.workspace.cardPrefix}
                weekStartsOn={workspace.weekStartDay}
                isTemplate={!!isTemplate}
                boardId={boardId ?? ""}
                canEditCard={canEditCard}
                canCreateCard={canCreateCard}
                cardReturnQuery={cardReturnQuery}
                isLocked={isFreeCloudPlan}
                upgradeUrl={upgradeUrl}
                onDateClick={openNewCardForDate}
                onCardDrop={handleCalendarCardDrop}
              />
            )
          ) : (
            <div
              ref={scrollRef}
              onMouseDown={onMouseDown}
              className={`scrollbar-w-none scrollbar-track-rounded-[4px] scrollbar-thumb-rounded-[4px] scrollbar-h-[8px] z-0 scrollbar flex-1 snap-x snap-mandatory scroll-pl-[10px] scrollbar-thumb-light-400 scrollbar-track-light-200 overflow-x-scroll overflow-y-hidden overscroll-contain md:snap-none dark:scrollbar-thumb-dark-300 dark:scrollbar-track-dark-100`}
            >
              {isLoading ? (
                <div className="ml-8 flex">
                  <div className="0 mr-5 h-[500px] w-[18rem] animate-pulse rounded-md bg-light-200 dark:bg-dark-100" />
                  <div className="0 mr-5 h-[275px] w-[18rem] animate-pulse rounded-md bg-light-200 dark:bg-dark-100" />
                  <div className="0 mr-5 h-[375px] w-[18rem] animate-pulse rounded-md bg-light-200 dark:bg-dark-100" />
                </div>
              ) : boardData ? (
                <>
                  {boardData.lists.length === 0 ? (
                    <div className="z-10 flex h-full w-full flex-col items-center justify-center space-y-8 pb-[150px]">
                      <div className="flex flex-col items-center">
                        <HiOutlineSquare3Stack3D className="h-10 w-10 text-light-800 dark:text-dark-800" />
                        <p className="mt-4 mb-2 text-[14px] font-bold text-light-1000 dark:text-dark-950">
                          {t`No lists`}
                        </p>
                        <p className="text-[14px] text-light-900 dark:text-dark-900">
                          {canCreateList
                            ? t`Get started by creating a new list`
                            : t`No lists have been created yet`}
                        </p>
                      </div>
                      <Tooltip
                        content={
                          !canCreateList
                            ? t`You don't have permission`
                            : undefined
                        }
                      >
                        <Button
                          onClick={() => {
                            if (boardId && canCreateList)
                              openNewListForm(boardId);
                          }}
                          disabled={!canCreateList}
                        >
                          {t`Create new list`}
                        </Button>
                      </Tooltip>
                    </div>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={collisionDetectionStrategy}
                      autoScroll={{ canScroll }}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={listIds}
                        strategy={horizontalListSortingStrategy}
                      >
                        <div className="flex w-max">
                          <div className="min-w-[10px] md:min-w-8" />
                          {lists.map((list) => (
                            <List
                              key={`list.${list.publicId}`}
                              list={list}
                              cardCount={
                                (cardsByList[list.publicId] ?? list.cards)
                                  .length
                              }
                              setSelectedPublicListId={(publicListId) => {
                                setNewCardInitialDueDate(null);
                                setSelectedPublicListId(publicListId);
                              }}
                            >
                              <CardList
                                listPublicId={list.publicId}
                                cards={cardsByList[list.publicId] ?? list.cards}
                                cardPrefix={boardData.workspace.cardPrefix}
                                canEditCard={!!canEditCard}
                                freezeHeight={dragCardsByList !== null}
                                getCardHref={getCardHref}
                              />
                            </List>
                          ))}
                          <div className="min-w-[calc(100vw-18rem)] md:min-w-3" />
                        </div>
                      </SortableContext>
                      {/* Portalled so the scroll container's stacking and offsets can't clip or shift it. */}
                      {createPortal(
                        <DragOverlay
                          dropAnimation={activeCard ? undefined : null}
                        >
                          {activeCard ? (
                            <div
                              style={
                                activeWidth ? { width: activeWidth } : undefined
                              }
                            >
                              <CardPreview
                                card={activeCard}
                                cardPrefix={boardData.workspace.cardPrefix}
                              />
                            </div>
                          ) : null}
                        </DragOverlay>,
                        document.body,
                      )}
                    </DndContext>
                  )}
                </>
              ) : null}
            </div>
          )}
        </CardContextMenu>
        {renderModalContent()}
      </div>
    </>
  );
}
