import { t } from "@lingui/core/macro";
import { useState } from "react";
import { HiMiniPlus, HiOutlineXMark } from "react-icons/hi2";

import type { Priority } from "~/components/PriorityIcon";
import { PriorityIcon } from "~/components/PriorityIcon";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";
import { invalidateCard } from "~/utils/cardInvalidation";

interface PrioritySelectorProps {
  cardPublicId: string;
  priority: Priority | null | undefined;
  isLoading?: boolean;
  disabled?: boolean;
}

export function PrioritySelector({
  cardPublicId,
  priority,
  isLoading = false,
  disabled = false,
}: PrioritySelectorProps) {
  const { showPopup } = usePopup();
  const utils = api.useUtils();
  const [isOpen, setIsOpen] = useState(false);

  const updatePriority = api.card.update.useMutation({
    onMutate: async (update) => {
      await utils.card.byId.cancel();

      const previousCard = utils.card.byId.getData({ cardPublicId });

      utils.card.byId.setData({ cardPublicId }, (oldCard) => {
        if (!oldCard) return oldCard;

        return {
          ...oldCard,
          priority:
            update.priority !== undefined
              ? (update.priority as Priority | null)
              : oldCard.priority,
        };
      });

      return { previousCard };
    },
    onError: (_error, _update, context) => {
      utils.card.byId.setData({ cardPublicId }, context?.previousCard);
      showPopup({
        header: t`Unable to update priority`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      await invalidateCard(utils, cardPublicId);
      await utils.board.byId.invalidate();
    },
  });

  const handleSelectPriority = (newPriority: Priority | null) => {
    setIsOpen(false);
    if (newPriority !== priority) {
      updatePriority.mutate({
        cardPublicId,
        priority: newPriority,
      });
    }
  };

  const priorityOptions: { key: Priority; label: string }[] = [
    { key: "urgent", label: t`Urgent` },
    { key: "high", label: t`High` },
    { key: "medium", label: t`Medium` },
    { key: "low", label: t`Low` },
  ];

  const getPriorityLabel = (p: Priority) => {
    switch (p) {
      case "urgent":
        return t`Urgent`;
      case "high":
        return t`High`;
      case "medium":
        return t`Medium`;
      case "low":
        return t`Low`;
    }
  };

  return (
    <div className="relative flex w-full items-center text-left">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={isLoading || disabled}
        className={`flex h-full w-full items-center rounded-[5px] border-[1px] border-light-50 py-1 pl-2 text-left text-xs text-neutral-900 dark:border-dark-50 dark:text-dark-1000 ${
          disabled
            ? "cursor-not-allowed opacity-60"
            : "hover:border-light-300 hover:bg-light-200 dark:hover:border-dark-200 dark:hover:bg-dark-100"
        }`}
      >
        {priority ? (
          <div className="flex items-center gap-2">
            <PriorityIcon priority={priority} size={14} />
            <span>{getPriorityLabel(priority)}</span>
          </div>
        ) : (
          <>
            <HiMiniPlus size={22} className="pr-2" />
            {t`Set priority`}
          </>
        )}
      </button>

      {isOpen && !disabled && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="absolute left-0 top-full z-20 mt-2 w-44 rounded-md border border-light-200 bg-light-50 p-1 shadow-lg dark:border-dark-200 dark:bg-dark-100"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <div className="flex flex-col space-y-1">
              {priorityOptions.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => handleSelectPriority(opt.key)}
                  className={`flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-xs text-neutral-900 hover:bg-light-200 dark:text-dark-1000 dark:hover:bg-dark-200 ${
                    priority === opt.key
                      ? "bg-light-200 font-medium dark:bg-dark-200"
                      : ""
                  }`}
                >
                  <PriorityIcon priority={opt.key} size={14} />
                  <span>{opt.label}</span>
                </button>
              ))}

              {priority && (
                <>
                  <div className="my-1 border-t border-light-200 dark:border-dark-200" />
                  <button
                    type="button"
                    onClick={() => handleSelectPriority(null)}
                    className="flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-xs text-neutral-500 hover:bg-light-200 hover:text-neutral-900 dark:text-dark-600 dark:hover:bg-dark-200 dark:hover:text-dark-1000"
                  >
                    <HiOutlineXMark size={14} />
                    <span>{t`Clear priority`}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default PrioritySelector;
