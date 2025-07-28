import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  HiOutlineBarsArrowDown,
  HiOutlineBarsArrowUp,
  HiXMark,
} from "react-icons/hi2";

import type { NewCardInput } from "@kan/api/types";
import { generateUID } from "@kan/shared/utils";

import Avatar from "~/components/Avatar";
import Button from "~/components/Button";
import CheckboxDropdown from "~/components/CheckboxDropdown";
import Editor from "~/components/Editor";
import Input from "~/components/Input";
import LabelIcon from "~/components/LabelIcon";
import Toggle from "~/components/Toggle";
import { useModalFormState } from "~/hooks/useModalFormState";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";
import { formatMemberDisplayName, getAvatarUrl } from "~/utils/helpers";

type NewCardFormInput = NewCardInput & {
  isCreateAnotherEnabled: boolean;
};

interface QueryParams {
  boardPublicId: string;
  members: string[];
  labels: string[];
}

interface NewCardFormProps {
  boardPublicId: string;
  listPublicId: string;
  queryParams: QueryParams;
}

export function NewCardForm({
  boardPublicId,
  listPublicId,
  queryParams,
}: NewCardFormProps) {
  const { showPopup } = usePopup();
  const { closeModal, openModal } = useModal();

  const utils = api.useUtils();

  // persists the form values
  const { formState, saveFormState } = useModalFormState<NewCardFormInput>({
    modalType: "NEW_CARD",
    initialValues: {
      title: "",
      description: "",
      listPublicId,
      labelPublicIds: [],
      memberPublicIds: [],
      isCreateAnotherEnabled: false,
      position: "start",
    },
    resetOnClose: true,
  });

  const { register, handleSubmit, reset, setValue, watch } =
    useForm<NewCardFormInput>({
      values: formState,
    });

  const labelPublicIds = watch("labelPublicIds") || [];
  const memberPublicIds = watch("memberPublicIds") || [];
  const isCreateAnotherEnabled = watch("isCreateAnotherEnabled");
  const position = watch("position");
  const title = watch("title");
  const description = watch("description");

  // saving form state whenever form values change
  useEffect(() => {
    const subscription = watch((data) => {
      saveFormState(data as NewCardFormInput);
    });
    return () => subscription.unsubscribe();
  }, [watch, saveFormState]);

  const { data: boardData } = api.board.byId.useQuery(queryParams, {
    enabled: !!boardPublicId,
  });

  const createCard = api.card.create.useMutation({
    onMutate: async (args) => {
      await utils.board.byId.cancel();

      const currentState = utils.board.byId.getData(queryParams);

      utils.board.byId.setData(queryParams, (oldBoard) => {
        if (!oldBoard) return oldBoard;

        const updatedLists = oldBoard.lists.map((list) => {
          if (list.publicId === listPublicId) {
            const newCard = {
              publicId: `PLACEHOLDER_${generateUID()}`,
              title: args.title,
              listId: 2,
              description: "",
              labels: oldBoard.labels.filter((label) =>
                args.labelPublicIds.includes(label.publicId),
              ),
              members:
                oldBoard.workspace.members
                  .filter((member) =>
                    args.memberPublicIds.includes(member.publicId),
                  )
                  .map((member) => ({
                    ...member,
                    deletedAt: null,
                  })) ?? [],
              _filteredLabels: labelPublicIds.map((id) => ({ publicId: id })),
              _filteredMembers: memberPublicIds.map((id) => ({ publicId: id })),
              index: position === "start" ? 0 : list.cards.length,
            };

            const updatedCards =
              position === "start"
                ? [newCard, ...list.cards]
                : [...list.cards, newCard];
            return { ...list, cards: updatedCards };
          }
          return list;
        });

        return { ...oldBoard, lists: updatedLists };
      });

      return { previousState: currentState };
    },
    onError: (error, _newList, context) => {
      utils.board.byId.setData(queryParams, context?.previousState);
      showPopup({
        header: t`Unable to create card`,
        message: error.data?.zodError?.fieldErrors.title?.[0]
          ? `${error.data.zodError.fieldErrors.title[0].replace("String", "Title")}`
          : t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSuccess: async () => {
      const isCreateAnotherEnabled = watch("isCreateAnotherEnabled");
      if (!isCreateAnotherEnabled) {
        // close modal (state will auto-clear due to resetOnClose: true)
        closeModal();
      } else {
        // reset form for creating another card
        const newFormState = {
          title: "",
          description: "",
          listPublicId: watch("listPublicId"),
          labelPublicIds: [],
          memberPublicIds: [],
          isCreateAnotherEnabled,
          position,
        };
        reset(newFormState);
        saveFormState(newFormState);
      }
      await utils.board.byId.invalidate(queryParams);
    },
  });

  useEffect(() => {
    const titleElement: HTMLElement | null =
      document.querySelector<HTMLElement>("#title");
    if (titleElement) titleElement.focus();
  }, []);

  const formattedLabels =
    boardData?.labels.map((label) => ({
      key: label.publicId,
      value: label.name,
      leftIcon: <LabelIcon colourCode={label.colourCode} />,
      selected: labelPublicIds.includes(label.publicId),
    })) ?? [];

  const formattedLists =
    boardData?.lists.map((list) => ({
      key: list.publicId,
      value: list.name,
      selected: list.publicId === watch("listPublicId"),
    })) ?? [];

  const formattedMembers =
    boardData?.workspace.members.map((member) => ({
      key: member.publicId,
      value: formatMemberDisplayName(
        member.user?.name ?? null,
        member.user?.email ?? member.email,
      ),
      selected: memberPublicIds.includes(member.publicId),
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
    })) ?? [];

  const onSubmit = (data: NewCardInput) => {
    createCard.mutate({
      title: data.title,
      description: data.description,
      listPublicId: data.listPublicId,
      labelPublicIds: data.labelPublicIds,
      memberPublicIds: data.memberPublicIds,
      position: data.position,
    });
  };

  const handleToggleCreateAnother = (): void => {
    setValue("isCreateAnotherEnabled", !isCreateAnotherEnabled);
  };

  const handleSelectList = (listPublicId: string): void => {
    setValue("listPublicId", listPublicId);
  };

  const handleSelectMembers = (memberPublicId: string): void => {
    const currentIndex = memberPublicIds.indexOf(memberPublicId);
    if (currentIndex === -1) {
      setValue("memberPublicIds", [...memberPublicIds, memberPublicId]);
    } else {
      const newMemberPublicIds = [...memberPublicIds];
      newMemberPublicIds.splice(currentIndex, 1);
      setValue("memberPublicIds", newMemberPublicIds);
    }
  };

  const handleSelectLabels = (labelPublicId: string): void => {
    const currentIndex = labelPublicIds.indexOf(labelPublicId);
    if (currentIndex === -1) {
      setValue("labelPublicIds", [...labelPublicIds, labelPublicId]);
    } else {
      const newLabelPublicIds = [...labelPublicIds];
      newLabelPublicIds.splice(currentIndex, 1);
      setValue("labelPublicIds", newLabelPublicIds);
    }
  };

  const selectedList = formattedLists.find((item) => item.selected);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="px-5 pt-5">
        <div className="flex w-full items-center justify-between pb-5">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-dark-1000">
            {t`New card`}
          </h2>
          <button
            type="button"
            className="rounded p-1 hover:bg-light-200 focus:outline-none dark:hover:bg-dark-300"
            onClick={(e) => {
              closeModal();
              e.preventDefault();
            }}
          >
            <HiXMark size={18} className="text-light-900 dark:text-dark-900" />
          </button>
        </div>

        <div>
          <Input
            id="title"
            placeholder={t`Card title`}
            {...register("title")}
            onKeyDown={async (e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                await handleSubmit(onSubmit)();
              }
            }}
          />
        </div>
        <div className="mt-2">
          <div className="block max-h-48 min-h-24 w-full overflow-y-auto rounded-md border-0 bg-dark-300 bg-white/5 px-3 py-2 text-sm shadow-sm ring-1 ring-inset ring-light-600 focus-within:ring-2 focus-within:ring-inset focus-within:ring-light-700 dark:ring-dark-700 dark:focus-within:ring-dark-700 sm:leading-6">
            <Editor
              content={description}
              onChange={(value) => {
                setValue("description", value);
                saveFormState({ ...formState, description: value });
              }}
            />
          </div>
        </div>
        <div className="mt-2 flex space-x-1">
          <div className="w-fit">
            <CheckboxDropdown
              items={formattedLists}
              handleSelect={(_groupKey, item) => handleSelectList(item.key)}
            >
              <div className="flex h-full w-full items-center rounded-[5px] border-[1px] border-light-600 bg-light-200 px-2 py-1 text-left text-xs text-light-800 hover:bg-light-300 dark:border-dark-600 dark:bg-dark-400 dark:text-dark-1000 dark:hover:bg-dark-500">
                {selectedList?.value}
              </div>
            </CheckboxDropdown>
          </div>
          <div className="w-fit">
            <CheckboxDropdown
              items={formattedMembers}
              handleSelect={(_groupKey, item) => handleSelectMembers(item.key)}
            >
              <div className="flex h-full w-full items-center rounded-[5px] border-[1px] border-light-600 bg-light-200 px-2 py-1 text-left text-xs text-light-800 hover:bg-light-300 dark:border-dark-600 dark:bg-dark-400 dark:text-dark-1000 dark:hover:bg-dark-500">
                {!memberPublicIds.length ? (
                  t`Members`
                ) : (
                  <div className="flex -space-x-1 overflow-hidden">
                    {memberPublicIds.map((memberPublicId) => {
                      const member = formattedMembers.find(
                        (member) => member.key === memberPublicId,
                      );

                      return (
                        <span
                          key={member?.key}
                          className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-400 ring-1 ring-light-200 dark:ring-dark-500"
                        >
                          <span className="text-[8px] font-medium leading-none text-white">
                            {member?.value
                              .split(" ")
                              .map((namePart) =>
                                namePart.charAt(0).toUpperCase(),
                              )
                              .join("")}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </CheckboxDropdown>
          </div>
          <div className="w-fit">
            <CheckboxDropdown
              items={formattedLabels}
              handleSelect={(_groupKey, item) => handleSelectLabels(item.key)}
              handleEdit={(labelPublicId) =>
                openModal("EDIT_LABEL", labelPublicId)
              }
              handleCreate={() => openModal("NEW_LABEL")}
              createNewItemLabel={t`Create new label`}
            >
              <div className="flex h-full w-full items-center rounded-[5px] border-[1px] border-light-600 bg-light-200 px-2 py-1 text-left text-xs text-light-800 hover:bg-light-300 dark:border-dark-600 dark:bg-dark-400 dark:text-dark-1000 dark:hover:bg-dark-500">
                {!labelPublicIds.length ? (
                  t`Labels`
                ) : (
                  <>
                    <div
                      className={
                        labelPublicIds.length > 1
                          ? "flex -space-x-[2px] overflow-hidden"
                          : "flex items-center"
                      }
                    >
                      {labelPublicIds.map((labelPublicId) => {
                        const label = boardData?.labels.find(
                          (label) => label.publicId === labelPublicId,
                        );

                        return (
                          <>
                            <svg
                              fill={label?.colourCode ?? "#3730a3"}
                              className="h-2 w-2"
                              viewBox="0 0 6 6"
                              aria-hidden="true"
                            >
                              <circle cx={3} cy={3} r={3} />
                            </svg>
                            {labelPublicIds.length === 1 && (
                              <div className="ml-1">{label?.name}</div>
                            )}
                          </>
                        );
                      })}
                    </div>
                    {labelPublicIds.length > 1 && (
                      <div className="ml-1">
                        <Trans>{`${labelPublicIds.length} labels`}</Trans>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CheckboxDropdown>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              setValue("position", position === "start" ? "end" : "start");
            }}
            className="flex h-auto items-center rounded-[5px] border-[1px] border-light-600 bg-light-200 px-1.5 py-1 text-left text-xs text-light-800 hover:bg-light-300 focus-visible:outline-none dark:border-dark-600 dark:bg-dark-400 dark:text-dark-1000 dark:hover:bg-dark-500"
          >
            {position === "start" ? (
              <HiOutlineBarsArrowUp size={14} />
            ) : (
              <HiOutlineBarsArrowDown size={14} />
            )}
          </button>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end border-t border-light-600 px-5 pb-5 pt-5 dark:border-dark-600">
        <Toggle
          label={t`Create another`}
          isChecked={isCreateAnotherEnabled}
          onChange={handleToggleCreateAnother}
        />

        <div>
          <Button
            type="submit"
            disabled={title.length === 0 || createCard.isPending}
          >
            {t`Create card`}
          </Button>
        </div>
      </div>
    </form>
  );
}
