import type { DropResult } from "react-beautiful-dnd";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useRouter } from "next/router";
import { keepPreviousData } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { DragDropContext, Draggable } from "react-beautiful-dnd";
import { useForm } from "react-hook-form";
import { HiOutlinePlusSmall, HiOutlineSquare3Stack3D } from "react-icons/hi2";

import type { UpdateBoardInput } from "@kan/api/types";

import Button from "~/components/Button";
import { DeleteLabelConfirmation } from "~/components/DeleteLabelConfirmation";
import { LabelForm } from "~/components/LabelForm";
import Modal from "~/components/modal";
import { NewWorkspaceForm } from "~/components/NewWorkspaceForm";
import { PageHead } from "~/components/PageHead";
import PatternedBackground from "~/components/PatternedBackground";
import { StrictModeDroppable as Droppable } from "~/components/StrictModeDroppable";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import { formatToArray } from "~/utils/helpers";
import BoardDropdown from "./components/BoardDropdown";
import Card from "./components/Card";
import { DeleteBoardConfirmation } from "./components/DeleteBoardConfirmation";
import { DeleteListConfirmation } from "./components/DeleteListConfirmation";
import Filters from "./components/Filters";
import List from "./components/List";
import { NewCardForm } from "./components/NewCardForm";
import { NewListForm } from "./components/NewListForm";
import { UpdateBoardSlugForm } from "./components/UpdateBoardSlugForm";
import VisibilityButton from "./components/VisibilityButton";

type PublicListId = string;

export default function BoardPage() {
  const params = useParams() as { boardId: string[] } | null;
  const router = useRouter();
  const utils = api.useUtils();
  const { showPopup } = usePopup();
  const { workspace } = useWorkspace();
  const { openModal, modalContentType, entityId } = useModal();
  const [selectedPublicListId, setSelectedPublicListId] =
    useState<PublicListId>("");
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const boardId = params?.boardId.length ? params.boardId[0] : null;

  const updateBoard = api.board.update.useMutation();

  const { register, handleSubmit, setValue } = useForm<UpdateBoardInput>({
    values: {
      boardPublicId: boardId ?? "",
      name: "",
    },
  });

  const onSubmit = (values: UpdateBoardInput) => {
    updateBoard.mutate({
      boardPublicId: values.boardPublicId,
      name: values.name,
    });
  };

  const queryParams = {
    boardPublicId: boardId ?? "",
    members: formatToArray(router.query.members),
    labels: formatToArray(router.query.labels),
  };

  const {
    data: boardData,
    isSuccess,
    isLoading: isQueryLoading,
  } = api.board.byId.useQuery(queryParams, {
    enabled: !!boardId,
    placeholderData: keepPreviousData,
  });

  const refetchBoard = async () => {
    if (boardId) await utils.board.byId.refetch({ boardPublicId: boardId });
  };

  useEffect(() => {
    if (boardId) {
      setIsInitialLoading(false);
    }
  }, [boardId]);

  const isLoading = isInitialLoading || isQueryLoading;

  const updateListMutation = api.list.update.useMutation({
    onMutate: async (args) => {
      await utils.board.byId.cancel();

      const currentState = utils.board.byId.getData(queryParams);

      utils.board.byId.setData(queryParams, (oldBoard) => {
        if (!oldBoard) return oldBoard;

        const updatedLists = Array.from(oldBoard.lists);

        const sourceList = updatedLists.find(
          (list) => list.publicId === args.listPublicId,
        );

        const currentIndex = sourceList?.index;

        if (currentIndex === undefined) return oldBoard;

        const removedList = updatedLists.splice(currentIndex, 1)[0];

        if (removedList && args.index !== undefined) {
          updatedLists.splice(args.index, 0, removedList);

          return {
            ...oldBoard,
            lists: updatedLists,
          };
        }
      });

      return { previousState: currentState };
    },
    onError: (_error, _newList, context) => {
      utils.board.byId.setData(queryParams, context?.previousState);
      showPopup({
        header: "Unable to update list",
        message: "Please try again later, or contact customer support.",
        icon: "error",
      });
    },
    onSettled: async () => {
      await utils.board.byId.invalidate(queryParams);
    },
  });

  const updateCardMutation = api.card.update.useMutation({
    onMutate: async (args) => {
      await utils.board.byId.cancel();

      const currentState = utils.board.byId.getData(queryParams);

      utils.board.byId.setData(queryParams, (oldBoard) => {
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
      utils.board.byId.setData(queryParams, context?.previousState);
      showPopup({
        header: "Unable to update card",
        message: "Please try again later, or contact customer support.",
        icon: "error",
      });
    },
    onSettled: async () => {
      await utils.board.byId.invalidate(queryParams);
    },
  });

  useEffect(() => {
    if (isSuccess && boardData) {
      setValue("name", boardData.name || "");
    }
  }, [isSuccess, boardData, setValue]);

  const openNewListForm = (publicBoardId: string) => {
    openModal("NEW_LIST");
    setSelectedPublicListId(publicBoardId);
  };

  const onDragEnd = ({
    source,
    destination,
    draggableId,
    type,
  }: DropResult): void => {
    if (!destination) {
      return;
    }

    if (type === "LIST") {
      updateListMutation.mutate({
        listPublicId: draggableId,
        index: destination.index,
      });
    }

    if (type === "CARD") {
      updateCardMutation.mutate({
        cardPublicId: draggableId,

        listPublicId: destination.droppableId,
        index: destination.index,
      });
    }
  };

  return (
    <>
      <PageHead
        title={`${boardData?.name ?? "Board"} | ${workspace.name ?? "Workspace"}`}
      />
      <div className="relative flex h-full flex-col">
        <PatternedBackground />
        <div className="z-10 flex w-full justify-between p-8">
          {isLoading ? (
            <div className="flex space-x-2">
              <div className="h-[2.3rem] w-[150px] animate-pulse rounded-[5px] bg-light-200 dark:bg-dark-100" />
            </div>
          ) : boardData ? (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="focus-visible:outline-none"
            >
              <input
                id="name"
                type="text"
                {...register("name")}
                onBlur={handleSubmit(onSubmit)}
                className="block border-0 bg-transparent p-0 py-0 font-bold leading-[2.3rem] tracking-tight text-neutral-900 focus:ring-0 focus-visible:outline-none dark:text-dark-1000 sm:text-[1.2rem]"
              />
            </form>
          ) : <p className="block p-0 py-0 font-bold leading-[2.3rem] tracking-tight text-neutral-900 dark:text-dark-1000 sm:text-[1.2rem]">Board not found</p>}

          <div className="flex items-center space-x-2">
            <VisibilityButton
              visibility={boardData?.visibility ?? "private"}
              boardPublicId={boardId ?? ""}
              queryParams={queryParams}
              isLoading={!boardData}
              isAdmin={workspace.role === "admin"}
            />
            <Filters
              labels={boardData?.labels ?? []}
              members={boardData?.workspace.members ?? []}
              position="left"
              isLoading={!boardData}
            />
            <Button
              iconLeft={
                <HiOutlinePlusSmall
                  className="-mr-0.5 h-5 w-5"
                  aria-hidden="true"
                />
              }
              onClick={() => {
                if (boardId) openNewListForm(boardId);
              }}
              disabled={!boardData}
            >
              New list
            </Button>
            <BoardDropdown isLoading={!boardData} />
          </div>
        </div>

        <div className="scrollbar-w-none scrollbar-track-rounded-[4px] scrollbar-thumb-rounded-[4px] scrollbar-h-[8px] z-0 flex-1 overflow-y-hidden overflow-x-scroll overscroll-contain scrollbar scrollbar-track-light-200 scrollbar-thumb-light-400 dark:scrollbar-track-dark-100 dark:scrollbar-thumb-dark-300">
          {isLoading ? (
            <div className="ml-[2rem] flex">
              <div className="0 mr-5 h-[500px] w-[18rem] animate-pulse rounded-md bg-light-200 dark:bg-dark-100" />
              <div className="0 mr-5 h-[275px] w-[18rem] animate-pulse rounded-md bg-light-200 dark:bg-dark-100" />
              <div className="0 mr-5 h-[375px] w-[18rem] animate-pulse rounded-md bg-light-200 dark:bg-dark-100" />
            </div>
          ) : boardData ? (
            <>
              {boardData?.lists.length === 0 ? (
                <div className="z-10 flex h-full w-full flex-col items-center justify-center space-y-8 pb-[150px]">
                  <div className="flex flex-col items-center">
                    <HiOutlineSquare3Stack3D className="h-10 w-10 text-light-800 dark:text-dark-800" />
                    <p className="mb-2 mt-4 text-[14px] font-bold text-light-1000 dark:text-dark-950">
                      No lists
                    </p>
                    <p className="text-[14px] text-light-900 dark:text-dark-900">
                      Get started by creating a new list
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      if (boardId) openNewListForm(boardId);
                    }}
                  >
                    Create new list
                  </Button>
                </div>
              ) : (
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable
                    droppableId="all-lists"
                    direction="horizontal"
                    type="LIST"
                  >
                    {(provided) => (
                      <div
                        className="flex"
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                      >
                        <div className="min-w-[2rem]" />
                        {boardData?.lists.map((list, index) => (
                          <List
                            index={index}
                            key={index}
                            list={list}
                            setSelectedPublicListId={(publicListId) =>
                              setSelectedPublicListId(publicListId)
                            }
                          >
                            <Droppable
                              droppableId={`${list.publicId}`}
                              type="CARD"
                            >
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                  className="scrollbar-track-rounded-[4px] scrollbar-thumb-rounded-[4px] scrollbar-w-[8px] z-10 h-full max-h-[calc(100vh-265px)] min-h-[2rem] overflow-y-auto pr-1 scrollbar scrollbar-track-dark-100 scrollbar-thumb-dark-600"
                                >
                                  {list.cards.map((card, index) => (
                                    <Draggable
                                      key={card.publicId}
                                      draggableId={card.publicId}
                                      index={index}
                                    >
                                      {(provided) => (
                                        <Link
                                          onClick={(e) => {
                                            if (
                                              card.publicId.startsWith(
                                                "PLACEHOLDER",
                                              )
                                            )
                                              e.preventDefault();
                                          }}
                                          key={card.publicId}
                                          href={`/cards/${card.publicId}`}
                                          className={`mb-2 flex !cursor-pointer flex-col ${card.publicId.startsWith(
                                            "PLACEHOLDER",
                                          )
                                              ? "pointer-events-none"
                                              : ""
                                            }`}
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                        >
                                          <Card
                                            title={card.title}
                                            labels={card.labels}
                                            members={card.members}
                                          />
                                        </Link>
                                      )}
                                    </Draggable>
                                  ))}
                                  {provided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          </List>
                        ))}
                        <div className="min-w-[0.75rem]" />
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </>
          ) : null}
        </div>
        <Modal modalSize={modalContentType === "NEW_CARD" ? "md" : "sm"}>
          {modalContentType === "DELETE_BOARD" && (
            <DeleteBoardConfirmation boardPublicId={boardId ?? ""} />
          )}
          {modalContentType === "DELETE_LIST" && (
            <DeleteListConfirmation
              listPublicId={selectedPublicListId}
              queryParams={queryParams}
            />
          )}
          {modalContentType === "NEW_CARD" && (
            <NewCardForm
              boardPublicId={boardId ?? ""}
              listPublicId={selectedPublicListId}
              queryParams={queryParams}
            />
          )}
          {modalContentType === "NEW_LIST" && (
            <NewListForm
              boardPublicId={boardId ?? ""}
              queryParams={queryParams}
            />
          )}
          {modalContentType === "NEW_WORKSPACE" && <NewWorkspaceForm />}
          {modalContentType === "NEW_LABEL" && (
            <LabelForm boardPublicId={boardId ?? ""} refetch={refetchBoard} />
          )}
          {modalContentType === "EDIT_LABEL" && (
            <LabelForm
              boardPublicId={boardId ?? ""}
              refetch={refetchBoard}
              isEdit
            />
          )}
          {modalContentType === "DELETE_LABEL" && (
            <DeleteLabelConfirmation
              refetch={refetchBoard}
              labelPublicId={entityId}
            />
          )}
          {modalContentType === "UPDATE_BOARD_SLUG" && (
            <UpdateBoardSlugForm
              boardPublicId={boardId ?? ""}
              workspaceSlug={workspace.slug ?? ""}
              boardSlug={boardData?.slug ?? ""}
              queryParams={queryParams}
            />
          )}
        </Modal>
      </div>
    </>
  );
}
