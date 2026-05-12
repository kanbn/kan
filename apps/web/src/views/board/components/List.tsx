import { useState, type ReactNode } from "react";
import { t } from "@lingui/core/macro";
import { Draggable } from "react-beautiful-dnd";
import { useForm } from "react-hook-form";
import {
  HiEllipsisHorizontal,
  HiOutlinePlusSmall,
  HiOutlineSignal,
  HiOutlineSquaresPlus,
  HiOutlineTrash,
} from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import { authClient } from "@kan/auth/client";

import Button from "~/components/Button";
import Dropdown from "~/components/Dropdown";
import { Tooltip } from "~/components/Tooltip";
import { usePermissions } from "~/hooks/usePermissions";
import { useModal } from "~/providers/modal";
import { api } from "~/utils/api";
import {
  getWipState,
  ListWipSummary,
} from "./ListWipSummary";

interface ListProps {
  children: ReactNode;
  index: number;
  list: List;
  setSelectedPublicListId: (publicListId: PublicListId) => void;
}

interface List {
  publicId: string;
  name: string;
  createdBy?: string | null;
  wipLimit?: number | null;
  cards: { publicId: string }[];
}

interface FormValues {
  listPublicId: string;
  name: string;
  wipLimit: number | null;
}

type PublicListId = string;

export default function List({
  children,
  index,
  list,
  setSelectedPublicListId,
}: ListProps) {
  const { openModal } = useModal();
  const { canCreateCard, canEditList, canDeleteList } = usePermissions();
  const { data: session } = authClient.useSession();
  const utils = api.useUtils();
  const isCreator = list.createdBy && session?.user.id === list.createdBy;
  const canEdit = canEditList || isCreator;
  const canDrag = canEditList || isCreator;
  const [isWipPanelOpen, setIsWipPanelOpen] = useState(false);
  const cardCount = list.cards.length;
  const wipState = getWipState(cardCount, list.wipLimit);

  const openNewCardForm = (publicListId: PublicListId) => {
    if (!canCreateCard) return;
    openModal("NEW_CARD");
    setSelectedPublicListId(publicListId);
  };

  const updateList = api.list.update.useMutation({
    onSettled: async () => {
      await utils.board.byId.invalidate();
    },
  });

  const { register, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      listPublicId: list.publicId,
      name: list.name,
      wipLimit: list.wipLimit ?? null,
    },
    values: {
      listPublicId: list.publicId,
      name: list.name,
      wipLimit: list.wipLimit ?? null,
    },
  });

  const onSubmit = (values: FormValues) => {
    if (!canEdit) return;
    updateList.mutate({
      listPublicId: values.listPublicId,
      name: values.name,
      wipLimit: values.wipLimit,
    });
  };

  const handleOpenDeleteListConfirmation = () => {
    setSelectedPublicListId(list.publicId);
    openModal("DELETE_LIST");
  };

  return (
    <Draggable
      key={list.publicId}
      draggableId={list.publicId}
      index={index}
      isDragDisabled={!canDrag}
    >
      {(provided) => (
        <div
          key={list.publicId}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={twMerge(
            "dark-text-dark-1000 mr-5 h-fit min-w-[18rem] max-w-[18rem] rounded-md border bg-light-300 py-2 pl-2 pr-1 text-neutral-900 transition-colors duration-200 dark:bg-dark-100",
            wipState === "normal" &&
              "border-light-400 dark:border-dark-300",
            wipState === "warning" &&
              "border-amber-300 bg-amber-50/40 dark:border-amber-500/30 dark:bg-amber-500/5",
            wipState === "danger" &&
              "border-red-300 bg-red-50/40 dark:border-red-500/30 dark:bg-red-500/5",
          )}
        >
          <div className="mb-2">
            <div className="flex justify-between gap-2">
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="w-full focus-visible:outline-none"
              >
                <input
                  id="name"
                  type="text"
                  {...register("name")}
                  onBlur={handleSubmit(onSubmit)}
                  readOnly={!canEdit}
                  className="w-full border-0 bg-transparent px-4 pt-1 text-sm font-medium text-neutral-900 focus:ring-0 focus-visible:outline-none dark:text-dark-1000"
                />
              </form>
              <div className="flex items-start">
                <Tooltip
                  content={
                    !canCreateCard ? t`You don't have permission` : undefined
                  }
                >
                  <button
                    className="mx-1 inline-flex h-fit items-center rounded-md p-1 px-1 text-sm font-semibold text-dark-50 hover:bg-light-400 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-dark-200"
                    onClick={() => openNewCardForm(list.publicId)}
                    disabled={!canCreateCard}
                  >
                    <HiOutlinePlusSmall
                      className="h-5 w-5 text-dark-900"
                      aria-hidden="true"
                    />
                  </button>
                </Tooltip>
                {(() => {
                  const dropdownItems = [
                    ...(canCreateCard
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
                    ...(canEdit
                      ? [
                          {
                            label: t`Edit WIP limit`,
                            action: () => setIsWipPanelOpen((value) => !value),
                            icon: (
                              <HiOutlineSignal className="h-[18px] w-[18px] text-dark-900" />
                            ),
                          },
                        ]
                      : []),
                    ...(canDeleteList || isCreator
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
                      <Dropdown items={dropdownItems}>
                        <HiEllipsisHorizontal className="h-5 w-5 text-dark-900" />
                      </Dropdown>
                    </div>
                  );
                })()}
              </div>
            </div>

            <ListWipSummary
              cardCount={cardCount}
              wipLimit={list.wipLimit}
              className="px-4 pt-1"
            />

            {isWipPanelOpen ? (
              <form
                onSubmit={handleSubmit((values) => {
                  onSubmit(values);
                  setIsWipPanelOpen(false);
                })}
                className="mx-2 mt-3 rounded-md border border-light-500 bg-light-200/70 p-3 dark:border-dark-300 dark:bg-dark-200"
              >
                <label
                  htmlFor={`wip-limit-${list.publicId}`}
                  className="mb-2 block text-xs font-medium text-light-1000 dark:text-dark-1000"
                >
                  {t`WIP limit`}
                </label>
                <input
                  id={`wip-limit-${list.publicId}`}
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder={t`Unlimited`}
                  {...register("wipLimit", {
                    setValueAs: (value) => {
                      if (value === "") return null;

                      return Number(value);
                    },
                  })}
                  className="block w-full rounded-md border-0 bg-dark-300 bg-white/5 py-1.5 text-sm shadow-sm ring-1 ring-inset ring-light-600 placeholder:text-dark-800 focus:ring-2 focus:ring-inset focus:ring-light-700 dark:text-dark-1000 dark:ring-dark-700 dark:focus:ring-dark-700 sm:leading-6"
                />
                <p className="mt-2 text-xs text-light-900 dark:text-dark-900">
                  {t`Use 0 or leave empty for unlimited.`}
                </p>
                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    type="button"
                    size="xs"
                    variant="secondary"
                    onClick={() => setIsWipPanelOpen(false)}
                  >
                    {t`Cancel`}
                  </Button>
                  <Button type="submit" size="xs" isLoading={updateList.isPending}>
                    {t`Save`}
                  </Button>
                </div>
              </form>
            ) : null}
          </div>
          {children}
        </div>
      )}
    </Draggable>
  );
}
