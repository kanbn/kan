import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Transition,
} from "@headlessui/react";
import { t } from "@lingui/core/macro";
import { useState } from "react";
import { HiChevronDown } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import Button from "~/components/Button";
import Input from "~/components/Input";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

interface CardContextDuplicateModalProps {
  boardPublicId?: string;
  isTemplate?: boolean;
}

export function CardContextDuplicateModal({
  boardPublicId: boardPublicIdProp,
  isTemplate: isTemplateProp,
}: CardContextDuplicateModalProps = {}) {
  const { entityId: cardPublicId, closeModal, getModalState } = useModal();
  const { showPopup } = usePopup();
  const utils = api.useUtils();

  const modalState = getModalState("CARD_CONTEXT_DUPLICATE") as
    | { boardPublicId: string; isTemplate?: boolean }
    | undefined;
  const boardPublicId =
    boardPublicIdProp ?? modalState?.boardPublicId ?? "";
  const isTemplate = isTemplateProp ?? modalState?.isTemplate ?? false;

  const [listPublicId, setListPublicId] = useState("");
  const [copyLabels, setCopyLabels] = useState(true);
  const [copyMembers, setCopyMembers] = useState(true);
  const [copyChecklists, setCopyChecklists] = useState(true);
  const [position, setPosition] = useState<string>("");
  const [title, setTitle] = useState("");

  const { data: card, isLoading: isCardLoading } = api.card.byId.useQuery(
    { cardPublicId: cardPublicId ?? "" },
    { enabled: !!cardPublicId && cardPublicId.length >= 12 },
  );

  const boardType = isTemplate ? "template" : "regular";
  const { data: board } = api.board.byId.useQuery(
    { boardPublicId, type: boardType },
    { enabled: !!boardPublicId },
  );
  const lists = board?.lists ?? [];
  const listOptions = lists.map((l) => ({ publicId: l.publicId, name: l.name }));
  const currentListPublicId = card?.list?.publicId;
  const hasLabels = (card?.labels?.length ?? 0) > 0;
  const hasMembers = (card?.members?.length ?? 0) > 0;
  const hasChecklists = (card?.checklists?.length ?? 0) > 0;
  const hasAnyCopyOption = hasLabels || hasMembers || hasChecklists;

  const duplicateCard = api.card.duplicate.useMutation({
    onSuccess: () => {
      showPopup({
        header: t`Card duplicated`,
        icon: "success",
        message: t`The card has been duplicated.`,
      });
      closeModal();
    },
    onError: () => {
      showPopup({
        header: t`Unable to duplicate card`,
        message: t`Please try again.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      await utils.board.byId.invalidate();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardPublicId || !listPublicId) return;
    const indexNum =
      position === "" ? undefined : parseInt(position, 10);
    if (
      position !== "" &&
      (indexNum === undefined || isNaN(indexNum) || indexNum < 0)
    )
      return;
    duplicateCard.mutate({
      cardPublicId,
      listPublicId,
      copyLabels,
      copyMembers,
      copyChecklists,
      ...(typeof indexNum === "number" && { index: indexNum }),
      title: title.trim() || undefined,
    });
  };

  if (!cardPublicId) return null;

  return (
    <form onSubmit={handleSubmit} className="p-4">
      <h2 className="mb-4 text-lg font-semibold text-light-1000 dark:text-dark-1000">
        {t`Duplicate card`}
      </h2>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-light-900 dark:text-dark-900">
            {t`List`}
          </label>
          <Listbox value={listPublicId} onChange={setListPublicId}>
            <div className="relative">
              <ListboxButton
                className={twMerge(
                  "relative w-full cursor-pointer rounded-md border border-light-300 bg-white py-2 pl-3 pr-10 text-left text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-light-400 focus:ring-offset-0 dark:border-dark-400 dark:bg-dark-200 dark:text-dark-1000 dark:focus:ring-dark-500",
                  !listPublicId && "text-light-600 dark:text-dark-600",
                )}
              >
                <span className="block truncate">
                  {listPublicId
                    ? listOptions.find((o) => o.publicId === listPublicId)
                        ?.name
                    : t`Select a list`}
                </span>
                <span className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 items-center">
                  <HiChevronDown
                    className="h-4 w-4 text-light-600 dark:text-dark-600"
                    aria-hidden
                  />
                </span>
              </ListboxButton>
              <Transition
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <ListboxOptions className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-light-200 bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:border-dark-400 dark:bg-dark-200">
                  <div className="max-h-60 overflow-y-auto py-1 pr-1 scrollbar scrollbar-track-rounded-[4px] scrollbar-thumb-rounded-[4px] scrollbar-w-[8px] scrollbar-track-light-200 scrollbar-thumb-light-400 dark:scrollbar-track-dark-100 dark:scrollbar-thumb-dark-600">
                    {listOptions.map((option) => {
                      const isCurrentList =
                        option.publicId === currentListPublicId;
                      return (
                        <ListboxOption
                          key={option.publicId}
                          value={option.publicId}
                          disabled={isCurrentList}
                          className={({ focus }) =>
                            twMerge(
                              "relative select-none py-2 pl-3 pr-9 text-sm",
                              isCurrentList
                                ? "cursor-default opacity-50"
                                : "cursor-pointer",
                              !isCurrentList && focus
                                ? "bg-light-200 text-light-1000 dark:bg-dark-400 dark:text-dark-1000"
                                : "text-light-900 dark:text-dark-900",
                            )
                          }
                        >
                          {option.name}
                        </ListboxOption>
                      );
                    })}
                  </div>
                </ListboxOptions>
              </Transition>
            </div>
          </Listbox>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-light-900 dark:text-dark-900">
            {t`Title (optional)`}
          </label>
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={card?.title ?? ""}
            className="w-full"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-light-900 dark:text-dark-900">
            {t`Position in list (0 = first, leave empty for end)`}
          </label>
          <Input
            type="number"
            min={0}
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder={t`End of list`}
            className="w-full"
          />
        </div>

        {hasAnyCopyOption && (
          <div className="flex flex-col gap-2">
            {hasLabels && (
              <div className="flex items-center gap-3">
                <label className="relative mt-[2px] inline-flex h-[16px] w-[16px] flex-shrink-0 cursor-pointer items-center justify-center">
                  <input
                    type="checkbox"
                    checked={copyLabels}
                    onChange={(e) => setCopyLabels(e.target.checked)}
                    className={twMerge(
                      "h-[16px] w-[16px] appearance-none rounded-md border border-light-500 bg-transparent outline-none ring-0 checked:bg-blue-600 focus:shadow-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none dark:border-dark-500 dark:hover:border-dark-500",
                      "cursor-pointer",
                    )}
                  />
                </label>
                <span className="text-sm text-light-900 dark:text-dark-900">
                  {t`Copy labels`}
                </span>
              </div>
            )}
            {hasMembers && (
              <div className="flex items-center gap-3">
                <label className="relative mt-[2px] inline-flex h-[16px] w-[16px] flex-shrink-0 cursor-pointer items-center justify-center">
                  <input
                    type="checkbox"
                    checked={copyMembers}
                    onChange={(e) => setCopyMembers(e.target.checked)}
                    className={twMerge(
                      "h-[16px] w-[16px] appearance-none rounded-md border border-light-500 bg-transparent outline-none ring-0 checked:bg-blue-600 focus:shadow-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none dark:border-dark-500 dark:hover:border-dark-500",
                      "cursor-pointer",
                    )}
                  />
                </label>
                <span className="text-sm text-light-900 dark:text-dark-900">
                  {t`Copy members`}
                </span>
              </div>
            )}
            {hasChecklists && (
              <div className="flex items-center gap-3">
                <label className="relative mt-[2px] inline-flex h-[16px] w-[16px] flex-shrink-0 cursor-pointer items-center justify-center">
                  <input
                    type="checkbox"
                    checked={copyChecklists}
                    onChange={(e) => setCopyChecklists(e.target.checked)}
                    className={twMerge(
                      "h-[16px] w-[16px] appearance-none rounded-md border border-light-500 bg-transparent outline-none ring-0 checked:bg-blue-600 focus:shadow-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none dark:border-dark-500 dark:hover:border-dark-500",
                      "cursor-pointer",
                    )}
                  />
                </label>
                <span className="text-sm text-light-900 dark:text-dark-900">
                  {t`Copy checklists`}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={closeModal}>
          {t`Cancel`}
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={
            !listPublicId ||
            duplicateCard.isPending ||
            isCardLoading ||
            lists.length === 0
          }
        >
          {duplicateCard.isPending ? t`Duplicating…` : t`Duplicate`}
        </Button>
      </div>
    </form>
  );
}
