import Link from "next/link";
import { useRouter } from "next/router";
import { t } from "@lingui/core/macro";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { IoChevronForwardSharp } from "react-icons/io5";

import Avatar from "~/components/Avatar";
import Editor from "~/components/Editor";
import FeedbackModal from "~/components/FeedbackModal";
import { LabelForm } from "~/components/LabelForm";
import LabelIcon from "~/components/LabelIcon";
import Modal from "~/components/modal";
import { NewWorkspaceForm } from "~/components/NewWorkspaceForm";
import { PageHead } from "~/components/PageHead";
import { useCardEvents } from "~/hooks/useRealtime";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import { formatMemberDisplayName, getAvatarUrl } from "~/utils/helpers";
import { DeleteLabelConfirmation } from "../../components/DeleteLabelConfirmation";
import ActivityList from "./components/ActivityList";
import Checklists from "./components/Checklists";
import { DeleteCardConfirmation } from "./components/DeleteCardConfirmation";
import { DeleteChecklistConfirmation } from "./components/DeleteChecklistConfirmation";
import { DeleteCommentConfirmation } from "./components/DeleteCommentConfirmation";
import Dropdown from "./components/Dropdown";
import LabelSelector from "./components/LabelSelector";
import ListSelector from "./components/ListSelector";
import MemberSelector from "./components/MemberSelector";
import { NewChecklistForm } from "./components/NewChecklistForm";
import NewCommentForm from "./components/NewCommentForm";

// Small helper to resolve board publicId from a card publicId using tRPC.
// We encapsulate a local cast to bridge typegen lag between packages; at runtime this is safe.
function useBoardPublicIdByCard(cardId: string | undefined) {
  type BoardLookup = { boardPublicId: string } | null;
  const hook = (
    api as unknown as {
      card?: {
        boardIdByCardPublicId?: {
          useQuery: (
            input: { cardPublicId: string },
            opts?: unknown,
          ) => { data?: BoardLookup };
        };
      };
    }
  ).card?.boardIdByCardPublicId?.useQuery;

  const res = hook?.(
    { cardPublicId: cardId ?? "" },
    {
      enabled: !!cardId,
      retry: false,
    },
  );
  return { boardPublicId: res?.data?.boardPublicId ?? undefined };
}

interface FormValues {
  cardId: string;
  title: string;
  description: string;
}

export function CardRightPanel() {
  const router = useRouter();
  const cardId = Array.isArray(router.query.cardId)
    ? router.query.cardId[0]
    : router.query.cardId;

  const { data: card } = api.card.byId.useQuery(
    {
      cardPublicId: cardId ?? "",
    },
    {
      enabled: !!cardId,
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );

  const board = card?.list.board;
  const labels = board?.labels;
  const workspaceMembers = board?.workspace.members;
  const selectedLabels = card?.labels;
  const selectedMembers = card?.members;

  const formattedLabels =
    labels?.map((label) => {
      const isSelected = selectedLabels?.some(
        (selectedLabel) => selectedLabel.publicId === label.publicId,
      );

      return {
        key: label.publicId,
        value: label.name,
        selected: isSelected ?? false,
        leftIcon: <LabelIcon colourCode={label.colourCode} />,
      };
    }) ?? [];

  const formattedLists =
    board?.lists.map((list) => ({
      key: list.publicId,
      value: list.name,
      selected: list.publicId === card?.list.publicId,
    })) ?? [];

  const formattedMembers =
    workspaceMembers?.map((member) => {
      const isSelected = selectedMembers?.some(
        (assignedMember) => assignedMember.publicId === member.publicId,
      );

      return {
        key: member.publicId,
        value: formatMemberDisplayName(
          member.user?.name ?? null,
          member.user?.email ?? member.email,
        ),
        imageUrl: member.user?.image
          ? getAvatarUrl(member.user.image)
          : undefined,
        selected: isSelected ?? false,
        leftIcon: (
          <Avatar
            size="xs"
            name={member.user?.name ?? ""}
            imageUrl={
              member.user?.image ? getAvatarUrl(member.user.image) : undefined
            }
            email={member.user?.email ?? member.email}
          />
        ),
      };
    }) ?? [];

  return (
    <div className="h-full w-[360px] border-l-[1px] border-light-300 bg-light-50 p-8 text-light-900 dark:border-dark-300 dark:bg-dark-50 dark:text-dark-900">
      <div className="mb-4 flex w-full flex-row">
        <p className="my-2 mb-2 w-[100px] text-sm font-medium">{t`List`}</p>
        <ListSelector
          cardPublicId={cardId ?? ""}
          lists={formattedLists}
          isLoading={!card}
        />
      </div>
      <div className="mb-4 flex w-full flex-row">
        <p className="my-2 mb-2 w-[100px] text-sm font-medium">{t`Labels`}</p>
        <LabelSelector
          cardPublicId={cardId ?? ""}
          labels={formattedLabels}
          isLoading={!card}
        />
      </div>
      <div className="flex w-full flex-row">
        <p className="my-2 mb-2 w-[100px] text-sm font-medium">{t`Members`}</p>
        <MemberSelector
          cardPublicId={cardId ?? ""}
          members={formattedMembers}
          isLoading={!card}
        />
      </div>
    </div>
  );
}

export default function CardPage() {
  const router = useRouter();
  const utils = api.useUtils();
  const {
    modalContentType,
    entityId,
    openModal: _openModal,
    getModalState,
    clearModalState,
    isOpen,
  } = useModal();
  const { showPopup } = usePopup();
  const { workspace } = useWorkspace();
  const [activeChecklistForm, setActiveChecklistForm] = useState<string | null>(
    null,
  );

  const cardId = Array.isArray(router.query.cardId)
    ? router.query.cardId[0]
    : router.query.cardId;

  // Resolve boardPublicId from the server by cardPublicId (works even if card is soft-deleted)
  const { boardPublicId: boardPublicIdFromApi } =
    useBoardPublicIdByCard(cardId);

  const {
    data: card,
    isLoading,
    isError,
    error,
    isFetched,
  } = api.card.byId.useQuery(
    { cardPublicId: cardId ?? "" },
    {
      enabled: !!cardId,
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );

  const board = card?.list.board;
  const boardId = board?.publicId;

  // Persist last known boardId so we can redirect correctly after the card disappears
  const lastBoardIdRef = useRef<string | undefined>(
    boardId ?? boardPublicIdFromApi,
  );
  useEffect(() => {
    if (boardId) lastBoardIdRef.current = boardId;
    else if (boardPublicIdFromApi)
      lastBoardIdRef.current = boardPublicIdFromApi;
  }, [boardId, boardPublicIdFromApi]);

  // If the card no longer exists (404 from server), redirect to its board (or boards index)
  useEffect(() => {
    const httpStatus = (
      error as unknown as {
        data?: { httpStatus?: number; code?: string };
      } | null
    )?.data?.httpStatus;
    const code = (
      error as unknown as {
        data?: { httpStatus?: number; code?: string };
      } | null
    )?.data?.code;
    if (isError && (httpStatus === 404 || code === "NOT_FOUND")) {
      const targetBoardId = lastBoardIdRef.current;
      void router.push(targetBoardId ? `/boards/${targetBoardId}` : "/boards");
    }
  }, [isError, error, router]);

  // If the query has been fetched and no card data exists (e.g., after a delete event cleared the cache), redirect
  useEffect(() => {
    if (!isLoading && isFetched && !card) {
      const targetBoardId: string | undefined = lastBoardIdRef.current;
      void router.push(targetBoardId ? `/boards/${targetBoardId}` : "/boards");
    }
  }, [card, isFetched, isLoading, router]);

  const refetchCard = async () => {
    if (cardId) await utils.card.byId.refetch({ cardPublicId: cardId });
  };
  // Subscribe to card and board SSE events to keep this view live (moves/deletes)
  useCardEvents(cardId, boardId);
  const activities = card?.activities;

  const updateCard = api.card.update.useMutation({
    onError: () => {
      showPopup({
        header: t`Unable to update card`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      await utils.card.byId.invalidate({ cardPublicId: cardId });
    },
  });

  const { register, handleSubmit, setValue } = useForm<FormValues>({
    values: {
      cardId: cardId ?? "",
      title: card?.title ?? "",
      description: card?.description ?? "",
    },
  });

  const onSubmit = (values: FormValues) => {
    updateCard.mutate({
      cardPublicId: values.cardId,
      title: values.title,
      description: values.description,
    });
  };

  // Open the new item form after creating a new checklist
  useEffect(() => {
    if (!card) return;
    const state = getModalState("ADD_CHECKLIST");
    const createdId: string | undefined = state?.createdChecklistId;
    if (createdId) {
      setActiveChecklistForm(createdId);
      clearModalState("ADD_CHECKLIST");
    }
  }, [card, getModalState, clearModalState]);

  if (!cardId) return <></>;

  return (
    <>
      <PageHead
        title={t`${card?.title ?? "Card"} | ${board?.name ?? "Board"}`}
      />
      <div className="flex h-full flex-1 flex-row overflow-hidden">
        <div className="scrollbar-thumb-rounded-[4px] scrollbar-track-rounded-[4px] w-full flex-1 overflow-y-auto scrollbar scrollbar-track-light-200 scrollbar-thumb-light-400 hover:scrollbar-thumb-light-400 dark:scrollbar-track-dark-100 dark:scrollbar-thumb-dark-300 dark:hover:scrollbar-thumb-dark-300">
          <div className="p-auto mx-auto flex h-full w-full max-w-[800px] flex-col">
            <div className="p-6 md:p-8">
              <div className="mb-8 flex w-full items-center justify-between md:mt-6">
                {!card && isLoading && (
                  <div className="flex space-x-2">
                    <div className="h-[2.3rem] w-[150px] animate-pulse rounded-[5px] bg-light-300 dark:bg-dark-300" />
                    <div className="h-[2.3rem] w-[300px] animate-pulse rounded-[5px] bg-light-300 dark:bg-dark-300" />
                  </div>
                )}
                {card && (
                  <>
                    <Link
                      className="whitespace-nowrap font-bold leading-[2.3rem] tracking-tight text-light-900 dark:text-dark-900 sm:text-[1.2rem]"
                      href={`/boards/${board?.publicId}`}
                    >
                      {board?.name}
                    </Link>
                    <IoChevronForwardSharp
                      size={18}
                      className="mx-2 text-light-900 dark:text-dark-900"
                    />
                    <form
                      onSubmit={handleSubmit(onSubmit)}
                      className="w-full space-y-6"
                    >
                      <div>
                        <input
                          type="text"
                          id="title"
                          {...register("title")}
                          onBlur={handleSubmit(onSubmit)}
                          className="block w-full border-0 bg-transparent p-0 py-0 font-bold tracking-tight text-neutral-900 focus:ring-0 dark:text-dark-1000 sm:text-[1.2rem]"
                        />
                      </div>
                    </form>
                    <div className="flex">
                      <Dropdown />
                    </div>
                  </>
                )}
              </div>
              {card && (
                <>
                  <div className="mb-10 flex w-full max-w-2xl flex-col justify-between">
                    <form
                      onSubmit={handleSubmit(onSubmit)}
                      className="w-full space-y-6"
                    >
                      <div className="mt-2">
                        <Editor
                          content={card.description}
                          onChange={(e) => setValue("description", e)}
                          onBlur={() => handleSubmit(onSubmit)()}
                          workspaceMembers={board?.workspace.members ?? []}
                        />
                      </div>
                    </form>
                  </div>
                  <Checklists
                    checklists={card.checklists}
                    cardPublicId={cardId}
                    activeChecklistForm={activeChecklistForm}
                    setActiveChecklistForm={setActiveChecklistForm}
                  />
                  <div className="border-t-[1px] border-light-300 pt-12 dark:border-dark-300">
                    <h2 className="text-md pb-4 font-medium text-light-1000 dark:text-dark-1000">
                      {t`Activity`}
                    </h2>
                    <div>
                      <ActivityList
                        cardPublicId={cardId}
                        activities={activities ?? []}
                        isLoading={!card}
                        isAdmin={workspace.role === "admin"}
                      />
                    </div>
                    <div className="mt-6">
                      <NewCommentForm cardPublicId={cardId} />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <>
          <Modal
            modalSize="md"
            isVisible={isOpen && modalContentType === "NEW_FEEDBACK"}
          >
            <FeedbackModal />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "NEW_LABEL"}
          >
            <LabelForm boardPublicId={boardId ?? ""} refetch={refetchCard} />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "EDIT_LABEL"}
          >
            <LabelForm
              boardPublicId={boardId ?? ""}
              refetch={refetchCard}
              isEdit
            />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "DELETE_LABEL"}
          >
            <DeleteLabelConfirmation
              refetch={refetchCard}
              labelPublicId={entityId}
            />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "DELETE_CARD"}
          >
            <DeleteCardConfirmation
              boardPublicId={boardId ?? ""}
              cardPublicId={cardId}
            />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "DELETE_COMMENT"}
          >
            <DeleteCommentConfirmation
              cardPublicId={cardId}
              commentPublicId={entityId}
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
            isVisible={isOpen && modalContentType === "ADD_CHECKLIST"}
          >
            <NewChecklistForm cardPublicId={cardId} />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "DELETE_CHECKLIST"}
          >
            <DeleteChecklistConfirmation
              cardPublicId={cardId}
              checklistPublicId={entityId}
            />
          </Modal>
        </>
      </div>
    </>
  );
}
