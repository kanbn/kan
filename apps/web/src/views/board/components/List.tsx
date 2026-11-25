import type { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { t } from "@lingui/core/macro";
import { useForm, useWatch } from "react-hook-form";
import {
  HiEllipsisHorizontal,
  HiOutlinePlusSmall,
  HiOutlineSquaresPlus,
  HiOutlineTrash,
} from "react-icons/hi2";

import { useUpdateList } from "@kan/api-client/hooks";
import { authClient } from "@kan/auth/client";

import type { ListDragData } from "../dnd/types";
import Dropdown from "~/components/Dropdown";
import { Tooltip } from "~/components/Tooltip";
import { usePermissions } from "~/hooks/usePermissions";
import { useModal } from "~/providers/modal";
import { isPlaceholderPublicId } from "~/utils/helpers";

interface ListProps {
  children: ReactNode;
  list: List;
  cardCount?: number;
  setSelectedPublicListId: (publicListId: PublicListId) => void;
}

interface List {
  publicId: string;
  name: string;
  createdBy?: string | null;
}

interface FormValues {
  listPublicId: string;
  name: string;
}

type PublicListId = string;

export default function List({
  children,
  list,
  cardCount,
  setSelectedPublicListId,
}: ListProps) {
  const { openModal } = useModal();
  const { canCreateCard, canEditList, canDeleteList } = usePermissions();
  const { data: session } = authClient.useSession();
  const isCreator = list.createdBy && session?.user.id === list.createdBy;
  const isOptimistic = isPlaceholderPublicId(list.publicId);
  const canEdit = canEditList || isCreator;
  const canDrag = !isOptimistic && (canEditList || isCreator);

  const openNewCardForm = (publicListId: PublicListId) => {
    if (!canCreateCard || isOptimistic) return;
    openModal("NEW_CARD");
    setSelectedPublicListId(publicListId);
  };

  const updateList = useUpdateList();

  const { register, handleSubmit, control, getValues, resetField } =
    useForm<FormValues>({
      defaultValues: {
        listPublicId: list.publicId,
        name: list.name,
      },
      values: {
        listPublicId: list.publicId,
        name: list.name,
      },
      // A refetch shouldn't undo a name being typed.
      resetOptions: { keepDirtyValues: true },
    });

  const listName = useWatch({ control, name: "name" });

  const onSubmit = (values: FormValues) => {
    if (!canEdit || isOptimistic) return;
    const { listPublicId, name } = values;
    updateList.mutate(
      { listPublicId, data: { name } },
      {
        // Otherwise it'd still count as unsaved, and overwrite later renames.
        onSuccess: () => {
          if (getValues("name") === name)
            resetField("name", { defaultValue: name });
        },
      },
    );
  };

  const handleOpenDeleteListConfirmation = () => {
    setSelectedPublicListId(list.publicId);
    openModal("DELETE_LIST");
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: list.publicId,
    data: { type: "LIST" } satisfies ListDragData,
    disabled: { draggable: !canDrag, droppable: false },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      data-board-draggable
      ref={(node) => {
        setNodeRef(node);
        // Stops Space and Enter in the name input from starting a drag.
        setActivatorNodeRef(node);
      }}
      style={style}
      {...attributes}
      {...listeners}
      className={`group/list mr-5 h-fit max-w-[18rem] min-w-[18rem] snap-start rounded-lg bg-light-200 py-2 pr-1 pl-2 text-neutral-900 md:snap-align-none dark:bg-dark-100 dark:text-dark-1000 ${
        canDrag ? (isDragging ? "cursor-grabbing" : "cursor-grab") : ""
      }`}
    >
      <div className="mb-1 flex items-center justify-between">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex min-w-0 flex-1 items-center focus-visible:outline-hidden"
        >
          {/* The hidden copy sizes the input to its text, so the count sits right after the name. */}
          <span className="inline-grid min-w-0 grid-cols-[minmax(0,auto)]">
            <span
              aria-hidden
              className="invisible col-start-1 row-start-1 overflow-hidden px-3 py-1 text-sm font-medium whitespace-pre"
            >
              {listName || " "}
            </span>
            <input
              id="name"
              type="text"
              size={1}
              aria-label={t`List name`}
              {...register("name")}
              onBlur={handleSubmit(onSubmit)}
              readOnly={!canEdit || isOptimistic}
              className="col-start-1 row-start-1 w-full min-w-0 border-0 bg-transparent px-3 py-1 text-sm font-medium text-ellipsis text-neutral-900 focus:ring-0 focus-visible:outline-hidden dark:text-dark-1000"
            />
          </span>
          {cardCount !== undefined && (
            <span className="shrink-0 text-[11px] text-light-800 tabular-nums dark:text-dark-800">
              {cardCount}
            </span>
          )}
        </form>
        <div className="flex items-center gap-0.5 transition-opacity md:opacity-0 md:group-hover/list:opacity-100 md:focus-within:opacity-100">
          <Tooltip
            content={!canCreateCard ? t`You don't have permission` : undefined}
          >
            <button
              className="inline-flex h-6 w-6 items-center justify-center rounded-[5px] hover:bg-light-300 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-dark-200"
              onClick={() => openNewCardForm(list.publicId)}
              disabled={!canCreateCard || isOptimistic}
              aria-label={t`Add card`}
            >
              <HiOutlinePlusSmall
                className="h-4 w-4 text-light-800 dark:text-dark-900"
                aria-hidden="true"
              />
            </button>
          </Tooltip>
          {(() => {
            const dropdownItems = [
              ...(canCreateCard && !isOptimistic
                ? [
                    {
                      label: t`Add a card`,
                      action: () => openNewCardForm(list.publicId),
                      icon: (
                        <HiOutlineSquaresPlus className="h-[18px] w-[18px] text-light-800 dark:text-dark-900" />
                      ),
                    },
                  ]
                : []),
              ...(!isOptimistic && (canDeleteList || isCreator)
                ? [
                    {
                      label: t`Delete list`,
                      action: handleOpenDeleteListConfirmation,
                      icon: (
                        <HiOutlineTrash className="h-[18px] w-[18px] text-light-800 dark:text-dark-900" />
                      ),
                    },
                  ]
                : []),
            ];

            if (dropdownItems.length === 0) {
              return null;
            }

            return (
              <div className="relative mr-1 inline-block">
                <Dropdown
                  items={dropdownItems}
                  ariaLabel={t`List options`}
                  buttonClassName="h-6 w-6 hover:bg-light-300"
                >
                  <HiEllipsisHorizontal className="h-4 w-4 text-light-800 dark:text-dark-900" />
                </Dropdown>
              </div>
            );
          })()}
        </div>
      </div>
      {children}
      {canCreateCard && !isOptimistic && (
        <button
          type="button"
          aria-label={t`Add card to ${list.name}`}
          onClick={() => openNewCardForm(list.publicId)}
          className="mr-1 flex w-[calc(100%-0.25rem)] items-center gap-1 rounded-md px-2.5 py-1 text-xs text-light-800 transition-colors hover:bg-light-300 hover:text-light-1000 dark:text-dark-800 dark:hover:bg-dark-200 dark:hover:text-dark-1000"
        >
          <HiOutlinePlusSmall className="h-3.5 w-3.5" aria-hidden="true" />
          {t`Add card`}
        </button>
      )}
    </div>
  );
}
