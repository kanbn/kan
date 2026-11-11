import { t } from "@lingui/core/macro";
import { useMutation } from "@tanstack/react-query";

import CheckboxDropdown from "~/components/CheckboxDropdown";
import { usePopup } from "~/providers/popup";
import { useBoardCache } from "~/utils/boardCache";
import { useCardCache } from "~/utils/cardCache";
import { invalidateCard } from "~/utils/cardInvalidation";
import { updateCardFromInput } from "~/utils/cardMutations";

interface ListSelectorProps {
  cardPublicId: string;
  lists: {
    key: string;
    value: string;
    selected: boolean;
  }[];
  isLoading: boolean;
  disabled?: boolean;
}

export default function ListSelector({
  cardPublicId,
  lists,
  isLoading,
  disabled = false,
}: ListSelectorProps) {
  const cardCache = useCardCache();
  const boardCache = useBoardCache();

  const { showPopup } = usePopup();

  const updateCardList = useMutation({
    mutationFn: updateCardFromInput,
    onMutate: async (newList) => {
      await cardCache.byId.cancel();

      const previousCard = cardCache.byId.getData({ cardPublicId });

      cardCache.byId.setData({ cardPublicId }, (oldCard) => {
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
      cardCache.byId.setData({ cardPublicId }, context?.previousCard);
      showPopup({
        header: t`Unable to update list`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      await invalidateCard(cardCache, cardPublicId);
      await boardCache.invalidate();
    },
  });

  const selectedList = lists.find((list) => list.selected);

  return (
    <>
      {isLoading ? (
        <div className="flex w-full">
          <div className="h-full w-[150px] animate-pulse rounded-[5px] bg-light-300 dark:bg-dark-300" />
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
          disabled={disabled}
          asChild
          ariaLabel={t`Current list`}
        >
          <div
            className={`flex h-full w-full items-center rounded-[5px] border-[1px] border-light-50 py-1 pl-2 text-left text-xs text-neutral-900 dark:border-dark-50 dark:text-dark-1000 ${disabled ? "cursor-not-allowed opacity-60" : "hover:border-light-300 hover:bg-light-200 dark:hover:border-dark-200 dark:hover:bg-dark-100"}`}
          >
            {selectedList?.value}
          </div>
        </CheckboxDropdown>
      )}
    </>
  );
}
