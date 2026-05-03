import { Menu, Transition } from "@headlessui/react";
import { t } from "@lingui/core/macro";
import { Fragment } from "react";

import type { CardType } from "@kan/shared/constants";
import { cardTypes, defaultCardType } from "@kan/shared/constants";

import CardTypeBadge, {
  CardTypeIcon,
  getCardTypeLabel,
} from "~/components/CardTypeBadge";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";
import { invalidateCard } from "~/utils/cardInvalidation";

interface CardTypeSelectorProps {
  cardPublicId?: string;
  type: CardType | null | undefined;
  onChange?: (type: CardType) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

const CardTypeSelector = ({
  cardPublicId,
  type,
  onChange,
  isLoading = false,
  disabled = false,
}: CardTypeSelectorProps) => {
  const selectedType = type ?? defaultCardType;
  const utils = api.useUtils();
  const { showPopup } = usePopup();

  const updateType = api.card.update.useMutation({
    onMutate: async (update) => {
      if (!cardPublicId) return {};

      await utils.card.byId.cancel({ cardPublicId });
      const previousCard = utils.card.byId.getData({ cardPublicId });

      utils.card.byId.setData({ cardPublicId }, (oldCard) => {
        if (!oldCard || update.type === undefined) return oldCard;

        return {
          ...oldCard,
          type: update.type,
        };
      });

      return { previousCard };
    },
    onError: (_error, _update, context) => {
      if (cardPublicId) {
        utils.card.byId.setData({ cardPublicId }, context?.previousCard);
      }

      showPopup({
        header: t`Unable to update type`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      if (cardPublicId) {
        await invalidateCard(utils, cardPublicId);
      }
      await utils.board.byId.invalidate();
      await utils.board.bySlug.invalidate();
    },
  });

  const handleSelect = (nextType: CardType) => {
    if (disabled || nextType === selectedType) return;

    if (onChange) {
      onChange(nextType);
      return;
    }

    if (cardPublicId) {
      updateType.mutate({ cardPublicId, type: nextType });
    }
  };

  return (
    <Menu as="div" className="relative flex w-full items-center text-left">
      <Menu.Button
        disabled={isLoading || disabled}
        className={`flex h-full w-full items-center rounded-[5px] border-[1px] border-light-50 py-1 pl-2 text-left text-xs text-neutral-900 focus-visible:outline-none dark:border-dark-50 dark:text-dark-1000 ${disabled ? "cursor-not-allowed opacity-60" : "hover:border-light-300 hover:bg-light-200 dark:hover:border-dark-200 dark:hover:bg-dark-100"}`}
      >
        {isLoading ? (
          <span className="h-5 w-24 animate-pulse rounded bg-light-300 dark:bg-dark-300" />
        ) : (
          <CardTypeBadge type={selectedType} size="sm" />
        )}
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute left-0 top-[32px] z-50 w-52 origin-top-left rounded-md border-[1px] border-light-200 bg-light-50 p-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:border-dark-500 dark:bg-dark-200">
          {cardTypes.map((cardType) => (
            <Menu.Item key={cardType}>
              {({ active }) => (
                <button
                  type="button"
                  onClick={() => handleSelect(cardType)}
                  className={`flex w-full items-center rounded-[5px] p-2 text-left text-[12px] text-dark-900 ${active ? "bg-light-200 dark:bg-dark-300" : ""}`}
                >
                  <span className="mr-3">
                    <CardTypeIcon type={cardType} />
                  </span>
                  <span>{getCardTypeLabel(cardType)}</span>
                  {cardType === selectedType && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-light-1000 dark:bg-dark-1000" />
                  )}
                </button>
              )}
            </Menu.Item>
          ))}
        </Menu.Items>
      </Transition>
    </Menu>
  );
};

export default CardTypeSelector;
