import type { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { t } from "@lingui/core/macro";
import { useForm } from "react-hook-form";
import {
  HiEllipsisHorizontal,
  HiOutlineArrowsPointingIn,
  HiOutlineArrowsPointingOut,
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
  cardCount: number;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
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
  isCollapsed,
  onToggleCollapsed,
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

  const { register, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      listPublicId: list.publicId,
      name: list.name,
    },
    values: {
      listPublicId: list.publicId,
      name: list.name,
    },
  });

  const onSubmit = (values: FormValues) => {
    if (!canEdit || isOptimistic) return;
    updateList.mutate({
      listPublicId: values.listPublicId,
      data: { name: values.name },
    });
  };

  const handleOpenDeleteListConfirmation = () => {
    setSelectedPublicListId(list.publicId);
    openModal("DELETE_LIST");
  };

  const {
    attributes,
    listeners,
    setNodeRef,
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

  if (isCollapsed) {
    return (
      <div
        data-board-draggable
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`dark-text-dark-1000 mr-5 flex h-fit min-h-[12rem] w-12 min-w-12 snap-start flex-col items-center rounded-md border border-light-400 bg-light-300 py-2 text-neutral-900 dark:border-dark-300 dark:bg-dark-100 md:snap-align-none ${
          canDrag ? (isDragging ? "cursor-grabbing" : "cursor-grab") : ""
        }`}
      >
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={t`Expand list`}
          className="flex h-7 w-7 items-center justify-center rounded-[5px] text-dark-900 hover:bg-light-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-light-700 dark:hover:bg-dark-200"
        >
          <HiOutlineArrowsPointingOut className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="mt-2 flex flex-1 items-start gap-2 [writing-mode:vertical-rl]">
          <span className="text-sm font-medium">{list.name}</span>
          <span
            className="text-xs text-light-900 dark:text-dark-800"
            aria-label={t`${cardCount} cards`}
          >
            {cardCount}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      data-board-draggable
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`dark-text-dark-1000 mr-5 h-fit min-w-[18rem] max-w-[18rem] snap-start rounded-md border border-light-400 bg-light-300 py-2 pl-2 pr-1 text-neutral-900 dark:border-dark-300 dark:bg-dark-100 md:snap-align-none ${
        canDrag ? (isDragging ? "cursor-grabbing" : "cursor-grab") : ""
      }`}
    >
      <div className="mb-2 flex justify-between">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="w-full focus-visible:outline-none"
        >
          <input
            id="name"
            type="text"
            aria-label={t`List name`}
            {...register("name")}
            onBlur={handleSubmit(onSubmit)}
            readOnly={!canEdit || isOptimistic}
            className="w-full border-0 bg-transparent px-4 pt-1 text-sm font-medium text-neutral-900 focus:ring-0 focus-visible:outline-none dark:text-dark-1000"
          />
        </form>
        <div className="flex items-center">
          <Tooltip
            content={!canCreateCard ? t`You don't have permission` : undefined}
          >
            <button
              className="mx-1 inline-flex h-fit items-center rounded-md p-1 px-1 text-sm font-semibold text-dark-50 hover:bg-light-400 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-dark-200"
              onClick={() => openNewCardForm(list.publicId)}
              disabled={!canCreateCard || isOptimistic}
              aria-label={t`Add card`}
            >
              <HiOutlinePlusSmall
                className="h-5 w-5 text-dark-900"
                aria-hidden="true"
              />
            </button>
          </Tooltip>
          {!isOptimistic && (
            <Tooltip content={t`Collapse list`}>
              <button
                type="button"
                onClick={onToggleCollapsed}
                aria-label={t`Collapse list`}
                className="inline-flex h-7 w-7 items-center justify-center rounded-[5px] text-dark-900 hover:bg-light-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-light-700 dark:hover:bg-dark-200"
              >
                <HiOutlineArrowsPointingIn
                  className="h-4 w-4"
                  aria-hidden="true"
                />
              </button>
            </Tooltip>
          )}
          {(() => {
            const dropdownItems = [
              ...(canCreateCard && !isOptimistic
                ? [
                    {
                      label: t`Add a card`,
                      action: () => openNewCardForm(list.publicId),
                      icon: (
                        <HiOutlineSquaresPlus className="h-[18px] w-[18px] text-dark-900" />
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
                        <HiOutlineTrash className="h-[18px] w-[18px] text-dark-900" />
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
                <Dropdown items={dropdownItems} ariaLabel={t`List options`}>
                  <HiEllipsisHorizontal className="h-5 w-5 text-dark-900" />
                </Dropdown>
              </div>
            );
          })()}
        </div>
      </div>
      {children}
    </div>
  );
}
