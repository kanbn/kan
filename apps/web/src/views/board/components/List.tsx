import type { ReactNode } from "react";
import { t } from "@lingui/core/macro";
import { Draggable } from "react-beautiful-dnd";
import { useForm } from "react-hook-form";
import {
  HiCheckCircle,
  HiEllipsisHorizontal,
  HiOutlinePlusSmall,
  HiOutlineSquaresPlus,
  HiOutlineTrash,
} from "react-icons/hi2";

import { authClient } from "@banana/auth/client";

import Dropdown from "~/components/Dropdown";
import { Tooltip } from "~/components/Tooltip";
import { usePermissions } from "~/hooks/usePermissions";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

interface ListProps {
  children: ReactNode;
  index: number;
  list: List;
  boardPublicId: string;
  setSelectedPublicListId: (publicListId: PublicListId) => void;
}

interface List {
  publicId: string;
  name: string;
  createdBy?: string | null;
  isDoneList?: boolean;
}

interface FormValues {
  listPublicId: string;
  name: string;
}

type PublicListId = string;

export default function List({
  children,
  index,
  list,
  boardPublicId,
  setSelectedPublicListId,
}: ListProps) {
  const { openModal } = useModal();
  const utils = api.useUtils();
  const { showPopup } = usePopup();
  const { canCreateCard, canEditList, canDeleteList } = usePermissions();
  const { data: session } = authClient.useSession();
  const isCreator = list.createdBy && session?.user.id === list.createdBy;
  const canEdit = canEditList || isCreator;
  const canDrag = canEditList || isCreator;

  const openNewCardForm = (publicListId: PublicListId) => {
    if (!canCreateCard) return;
    openModal("NEW_CARD");
    setSelectedPublicListId(publicListId);
  };

  const updateList = api.list.update.useMutation();

  const setDoneList = api.list.setDoneList.useMutation({
    onMutate: async (args) => {
      const queryParams = { boardPublicId };
      await utils.board.byId.cancel(queryParams);
      const previousBoard = utils.board.byId.getData(queryParams);
      utils.board.byId.setData(queryParams, (old) => {
        if (!old) return old;
        return {
          ...old,
          lists: old.lists.map((l) => ({
            ...l,
            isDoneList: l.publicId === list.publicId ? args.isDoneList : false,
          })),
        };
      });
      return { previousBoard };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previousBoard)
        utils.board.byId.setData({ boardPublicId }, ctx.previousBoard);
      showPopup({
        header: t`Unable to update list`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      await utils.board.byId.invalidate({ boardPublicId });
    },
  });

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
    if (!canEdit) return;
    updateList.mutate({
      listPublicId: values.listPublicId,
      name: values.name,
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
          className="dark-text-dark-1000 mr-5 h-fit min-w-[18rem] max-w-[18rem] rounded-md border border-light-400 bg-light-300 py-2 pl-2 pr-1 text-neutral-900 dark:border-dark-300 dark:bg-dark-100"
        >
          <div className="mb-2 flex justify-between">
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
            <div className="flex items-center">
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
                          label: list.isDoneList
                            ? t`Remove as Done list`
                            : t`Set as Done list`,
                          action: () =>
                            setDoneList.mutate({
                              listPublicId: list.publicId,
                              isDoneList: !list.isDoneList,
                            }),
                          icon: (
                            <HiCheckCircle className="h-[18px] w-[18px] text-dark-900" />
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
          {children}
        </div>
      )}
    </Draggable>
  );
}
