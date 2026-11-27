import { useRouter } from "next/router";
import { t } from "@lingui/core/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import {
  HiEllipsisHorizontal,
  HiMiniPlus,
  HiMiniXMark,
  HiOutlineTag,
  HiXMark,
} from "react-icons/hi2";
import { IoFilterOutline } from "react-icons/io5";

import type {
  BoardListItemDtoOutput,
  getBoardsResponse,
} from "@kan/api-client/hooks";
import {
  getGetBoardLabelsQueryKey,
  getGetBoardsQueryKey,
  useGetBoardLabels,
  useGetBoards,
  useUpdateBoard,
} from "@kan/api-client/hooks";

import Button from "~/components/Button";
import Checkbox from "~/components/Checkbox";
import CheckboxDropdown from "~/components/CheckboxDropdown";
import { DeleteLabelConfirmation } from "~/components/DeleteLabelConfirmation";
import { LabelForm } from "~/components/LabelForm";
import LabelIcon from "~/components/LabelIcon";
import Modal from "~/components/modal";
import { useModal } from "~/providers/modal";
import { useWorkspace } from "~/providers/workspace";
import { formatToArray } from "~/utils/helpers";

export const useWorkspaceBoardLabels = () => {
  const { workspace } = useWorkspace();
  return useGetBoardLabels(workspace.publicId, {
    query: { enabled: !!workspace.publicId, select: (res) => res.data },
  });
};

export const useBoardLabelFilter = () => {
  const router = useRouter();
  const selected = formatToArray(router.query.labels);
  const setSelected = (labels: string[]) =>
    router.push(
      { pathname: router.pathname, query: { ...router.query, labels } },
      undefined,
      { shallow: true },
    );
  return { selected, setSelected };
};

type LabelledBoard = Pick<BoardListItemDtoOutput, "publicId" | "boardLabels">;

const BOARD_LABEL_MODALS = [
  "BOARD_LABELS",
  "NEW_BOARD_LABEL",
  "EDIT_BOARD_LABEL",
  "DELETE_BOARD_LABEL",
];

function useBoardLabelToggle(board: LabelledBoard | undefined) {
  const { workspace } = useWorkspace();
  const {
    openModal,
    isOpen,
    modalContentType,
    entityId,
    modalStates,
    clearModalState,
  } = useModal();
  const queryClient = useQueryClient();
  const { data: labels = [] } = useWorkspaceBoardLabels();
  const boardsKey = getGetBoardsQueryKey(workspace.publicId);

  const updateBoard = useUpdateBoard({
    mutation: {
      onMutate: async ({ boardPublicId, data }) => {
        await queryClient.cancelQueries({ queryKey: boardsKey });
        const ids = new Set(data.labelPublicIds);
        queryClient.setQueriesData<getBoardsResponse>(
          { queryKey: boardsKey },
          (old) =>
            old && {
              ...old,
              data: old.data.map((b) =>
                b.publicId === boardPublicId
                  ? {
                      ...b,
                      boardLabels: [...ids].map(
                        (id) =>
                          labels.find((l) => l.publicId === id) ??
                          b.boardLabels.find((l) => l.publicId === id) ?? {
                            publicId: id,
                            name: "",
                            colourCode: null,
                          },
                      ),
                    }
                  : b,
              ),
            },
        );
      },
      onSettled: () => queryClient.invalidateQueries({ queryKey: boardsKey }),
    },
  });

  const current = board?.boardLabels.map((l) => l.publicId) ?? [];
  const setLabels = (labelPublicIds: string[]) =>
    board &&
    updateBoard.mutate({
      boardPublicId: board.publicId,
      data: { labelPublicIds },
    });

  // A label created from this board's picker is added to the board. The check
  // runs before the tracking effect, as creating also closes the form.
  const creatingHere = useRef(false);
  useEffect(() => {
    const labelPublicId = modalStates.NEW_LABEL_CREATED as string | undefined;
    if (labelPublicId && creatingHere.current) {
      setLabels([...current, labelPublicId]);
      clearModalState("NEW_LABEL_CREATED");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalStates.NEW_LABEL_CREATED]);
  useEffect(() => {
    creatingHere.current =
      isOpen &&
      modalContentType === "NEW_BOARD_LABEL" &&
      entityId === board?.publicId;
  }, [isOpen, modalContentType, entityId, board?.publicId]);

  return {
    labels,
    isSelected: (key: string) => current.includes(key),
    toggle: (key: string) =>
      setLabels(
        current.includes(key)
          ? current.filter((id) => id !== key)
          : [...current, key],
      ),
    create: () => board && openModal("NEW_BOARD_LABEL", board.publicId),
    edit: (key: string) => openModal("EDIT_BOARD_LABEL", key),
  };
}

export function BoardLabelPicker({ board }: { board: LabelledBoard }) {
  const { labels, isSelected, toggle, create, edit } =
    useBoardLabelToggle(board);

  return (
    <CheckboxDropdown
      items={labels.map((label) => ({
        key: label.publicId,
        value: label.name,
        selected: isSelected(label.publicId),
        leftIcon: <LabelIcon colourCode={label.colourCode} />,
      }))}
      handleSelect={(_, { key }) => toggle(key)}
      handleCreate={create}
      handleEdit={edit}
      createNewItemLabel={t`Create label`}
      ariaLabel={t`Board labels`}
      position="right"
    >
      <span className="block rounded-md p-1 transition-all hover:bg-light-400 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100 dark:hover:bg-dark-300">
        <HiOutlineTag className="h-3.5 w-3.5 text-light-900 dark:text-dark-900" />
      </span>
    </CheckboxDropdown>
  );
}

export function BoardLabelModals() {
  const { workspace } = useWorkspace();
  const { isOpen, modalContentType, entityId } = useModal();
  const queryClient = useQueryClient();
  const refetch = () => {
    void queryClient.invalidateQueries({
      queryKey: getGetBoardLabelsQueryKey(workspace.publicId),
    });
    void queryClient.invalidateQueries({
      queryKey: getGetBoardsQueryKey(workspace.publicId),
    });
  };

  return (
    <>
      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "NEW_BOARD_LABEL"}
      >
        <LabelForm workspacePublicId={workspace.publicId} refetch={refetch} />
      </Modal>
      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "EDIT_BOARD_LABEL"}
      >
        <LabelForm
          workspacePublicId={workspace.publicId}
          refetch={refetch}
          isEdit
        />
      </Modal>
      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "DELETE_BOARD_LABEL"}
      >
        <DeleteLabelConfirmation
          labelPublicId={entityId}
          refetch={refetch}
          isBoardLabel
        />
      </Modal>
    </>
  );
}

// For the board page, opened from the board's dropdown.
export function BoardLabelsModal({
  boardPublicId,
  archived,
}: {
  boardPublicId: string;
  archived: boolean;
}) {
  const { workspace } = useWorkspace();
  const { isOpen, modalContentType, closeModal } = useModal();
  const { data: board } = useGetBoards(
    workspace.publicId,
    { type: "regular", archived: archived ? "true" : "false" },
    {
      query: {
        enabled:
          !!workspace.publicId &&
          isOpen &&
          BOARD_LABEL_MODALS.includes(modalContentType),
        select: (res) => res.data.find((b) => b.publicId === boardPublicId),
      },
    },
  );
  const { labels, isSelected, toggle, create, edit } =
    useBoardLabelToggle(board);

  return (
    <>
      <BoardLabelModals />
      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "BOARD_LABELS"}
      >
        <div className="p-5">
          <div className="flex items-center justify-between pb-3">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-dark-1000">
              {t`Labels`}
            </h2>
            <button
              type="button"
              aria-label={t`Close`}
              className="rounded-md p-1 hover:bg-light-200 dark:hover:bg-dark-300"
              onClick={closeModal}
            >
              <HiXMark
                size={16}
                className="text-light-900 dark:text-dark-900"
              />
            </button>
          </div>
          {labels.map((label) => (
            <div
              key={label.publicId}
              className="group/item flex items-center rounded-[5px] p-2 hover:bg-light-200 dark:hover:bg-dark-300"
            >
              <Checkbox
                id={`board-label-${label.publicId}`}
                checked={isSelected(label.publicId)}
                disabled={!board}
                onChange={() => toggle(label.publicId)}
              />
              <label
                htmlFor={`board-label-${label.publicId}`}
                className="ml-3 flex flex-1 items-center gap-3 text-[12px] text-dark-900"
              >
                <LabelIcon colourCode={label.colourCode} />
                {label.name}
              </label>
              <button
                type="button"
                aria-label={t`Edit label`}
                className="invisible group-hover/item:visible"
                onClick={() => edit(label.publicId)}
              >
                <HiEllipsisHorizontal size={20} className="text-dark-900" />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="flex w-full items-center rounded-[5px] p-2 text-[12px] text-dark-900 hover:bg-light-200 dark:hover:bg-dark-300"
            onClick={create}
          >
            <HiMiniPlus size={20} className="pr-1.5" />
            {t`Create label`}
          </button>
        </div>
      </Modal>
    </>
  );
}

export function BoardFilters() {
  const { data: labels = [] } = useWorkspaceBoardLabels();
  const { selected, setSelected } = useBoardLabelFilter();

  return (
    <div className="relative">
      <CheckboxDropdown
        groups={[
          {
            key: "labels",
            label: t`Labels`,
            icon: <HiOutlineTag size={16} />,
            items: labels.map((label) => ({
              key: label.publicId,
              value: label.name,
              selected: selected.includes(label.publicId),
              leftIcon: <LabelIcon colourCode={label.colourCode} />,
            })),
            selectedCount: selected.length,
          },
        ]}
        handleSelect={(_, { key }) =>
          void setSelected(
            selected.includes(key)
              ? selected.filter((id) => id !== key)
              : [...selected, key],
          )
        }
        position="right"
        footer={
          selected.length > 0 ? (
            <button
              type="button"
              onClick={() => void setSelected([])}
              className="flex w-full items-center rounded-[5px] p-2 text-[12px] font-semibold text-dark-900 hover:bg-light-200 dark:hover:bg-dark-300"
            >
              <HiMiniXMark size={16} className="mr-2" aria-hidden="true" />
              {t`Clear filters`}
            </button>
          ) : undefined
        }
      >
        <Button variant="secondary" size="sm">
          <span className="flex items-center gap-2">
            <IoFilterOutline />
            <span className="hidden sm:inline">{t`Filters`}</span>
          </span>
        </Button>
      </CheckboxDropdown>
      {selected.length > 0 && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-2.5 -right-2.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-light-100 bg-light-1000 text-[8px] leading-none font-bold text-light-600 dark:border-dark-50 dark:bg-dark-1000 dark:text-dark-600"
        >
          {selected.length}
        </span>
      )}
    </div>
  );
}
