import { Menu } from "@headlessui/react";
import { t } from "@lingui/core/macro";
import { CgArrowDown } from "react-icons/cg";

import CheckboxDropdown from "~/components/CheckboxDropdown";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

interface ListSelectorProps {
  cardPublicId: string;
  lists: {
    key: string;
    value: string;
    selected: boolean;
  }[];
  isLoading: boolean;
}

export default function ListSelector({
  cardPublicId,
  lists,
  isLoading,
}: ListSelectorProps) {
  const utils = api.useUtils();

  const { showPopup } = usePopup();

  const updateCardList = api.card.update.useMutation({
    onMutate: async (newList) => {
      await utils.card.byId.cancel();

      const previousCard = utils.card.byId.getData({ cardPublicId });

      utils.card.byId.setData({ cardPublicId }, (oldCard) => {
        if (!oldCard) return oldCard;

        return {
          ...oldCard,
          list: {
            ...oldCard.list,
            publicId: newList.listPublicId ?? "",
            name: oldCard.list.name ?? "",
            board: oldCard.list.board ?? null,
          },
        };
      });

      return { previousCard };
    },
    onError: (_error, _newList, context) => {
      utils.card.byId.setData({ cardPublicId }, context?.previousCard);
      showPopup({
        header: t`Unable to update list`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      await utils.card.byId.invalidate({ cardPublicId });
    },
  });

  const selectedList = lists.find((list) => list.selected);

  return (
    <>
      {isLoading ? (
        <div className="flex w-full">
          <div className="h-full w-full animate-pulse rounded-[5px] border border-neutral-700 bg-light-300 dark:bg-dark-300 md:w-[150px]" />
        </div>
      ) : (
        <CheckboxDropdown
          items={lists}
          handleSelect={(_, member) => {
            updateCardList.mutate({
              cardPublicId,
              listPublicId: member.key,
              index: 0,
            });
          }}
          asChild
        >
          <Menu.Button className="flex h-full w-full items-start gap-4 rounded-[5px] border-[1px] border-neutral-400 py-1 pl-2 text-left text-sm text-neutral-900 hover:border-light-300 hover:bg-light-200 dark:border-dark-50 dark:text-dark-1000 dark:hover:border-dark-200 dark:hover:bg-dark-100 md:max-w-36 md:justify-center">
            {selectedList?.value}
          </Menu.Button>
        </CheckboxDropdown>
      )}
    </>
  );
}
