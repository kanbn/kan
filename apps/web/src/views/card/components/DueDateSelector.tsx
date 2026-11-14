import { t } from "@lingui/core/macro";
import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { HiMiniPlus } from "react-icons/hi2";

import DateSelector from "~/components/DateSelector";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { useBoardCache } from "~/utils/boardCache";
import { useCardCache } from "~/utils/cardCache";
import { invalidateCard } from "~/utils/cardInvalidation";
import { updateCardFromInput } from "~/utils/cardMutations";

interface DueDateSelectorProps {
  cardPublicId: string;
  /** ISO string, as the API returns it. */
  dueDate: string | null | undefined;
  isLoading?: boolean;
  disabled?: boolean;
}

export function DueDateSelector({
  cardPublicId,
  dueDate: dueDateIso,
  isLoading = false,
  disabled = false,
}: DueDateSelectorProps) {
  const { showPopup } = usePopup();
  const { workspace } = useWorkspace();
  const cardCache = useCardCache();
  const boardCache = useBoardCache();
  const [isOpen, setIsOpen] = useState(false);
  // Memoised so the sync effect below only runs when the date changes.
  const dueDate = useMemo(
    () =>
      dueDateIso === undefined
        ? undefined
        : dueDateIso
          ? new Date(dueDateIso)
          : null,
    [dueDateIso],
  );
  const [pendingDate, setPendingDate] = useState<Date | null | undefined>(
    dueDate,
  );

  // Sync pendingDate with dueDate when it changes externally
  useEffect(() => {
    if (!isOpen) {
      setPendingDate(dueDate);
    }
  }, [dueDate, isOpen]);

  const updateDueDate = useMutation({
    mutationFn: updateCardFromInput,
    onMutate: async (update) => {
      await cardCache.byId.cancel();

      const previousCard = cardCache.byId.getData({ cardPublicId });

      cardCache.byId.setData({ cardPublicId }, (oldCard) => {
        if (!oldCard) return oldCard;

        return {
          ...oldCard,
          dueDate:
            update.dueDate !== undefined
              ? (update.dueDate?.toISOString() ?? null)
              : oldCard.dueDate,
        };
      });

      return { previousCard };
    },
    onError: (_error, _update, context) => {
      cardCache.byId.setData({ cardPublicId }, context?.previousCard);
      showPopup({
        header: t`Unable to update due date`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      await invalidateCard(cardCache, cardPublicId);
      await boardCache.invalidate();
    },
  });

  const handleDateSelect = (date: Date | undefined) => {
    // Only update local state, don't fire mutation
    setPendingDate(date ?? null);
  };

  const handleBackdropClick = () => {
    // Only fire mutation if date actually changed
    const pendingIsNull = pendingDate === null || pendingDate === undefined;
    const dueIsNull = dueDate === null || dueDate === undefined;

    let dateChanged = false;
    if (pendingIsNull && !dueIsNull) {
      dateChanged = true;
    } else if (!pendingIsNull && dueIsNull) {
      dateChanged = true;
    } else if (!pendingIsNull && !dueIsNull) {
      // Both are non-null at this point
      if (pendingDate instanceof Date && dueDate instanceof Date) {
        dateChanged = pendingDate.getTime() !== dueDate.getTime();
      }
    }

    // Close popover immediately
    setIsOpen(false);

    // Fire mutation if date changed (optimistic update will handle UI)
    if (dateChanged) {
      updateDueDate.mutate({
        cardPublicId,
        dueDate: pendingDate ?? null,
      });
    }
  };

  return (
    <div className="relative flex w-full items-center text-left">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={isLoading || disabled}
        className={`flex h-full w-full items-center rounded-[5px] border border-light-50 py-1 pl-2 text-left text-xs text-neutral-900 dark:border-dark-50 dark:text-dark-1000 ${disabled ? "cursor-not-allowed opacity-60" : "hover:border-light-300 hover:bg-light-200 dark:hover:border-dark-200 dark:hover:bg-dark-100"}`}
      >
        {dueDate ? (
          <span>{format(dueDate, "MMM d, yyyy")}</span>
        ) : (
          <>
            <HiMiniPlus size={22} className="pr-2" />
            {t`Set due date`}
          </>
        )}
      </button>
      {isOpen && !disabled && (
        <>
          <div className="fixed inset-0 z-10" onClick={handleBackdropClick} />
          <div
            className="absolute -left-8 top-full z-20 mt-2 rounded-md border border-light-200 bg-light-50 shadow-lg dark:border-dark-200 dark:bg-dark-100"
            onClick={(e) => {
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
          >
            <DateSelector
              selectedDate={pendingDate ?? undefined}
              onDateSelect={handleDateSelect}
              weekStartsOn={workspace.weekStartDay}
            />
          </div>
        </>
      )}
    </div>
  );
}
