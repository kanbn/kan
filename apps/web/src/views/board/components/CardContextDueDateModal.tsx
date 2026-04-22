import { t } from "@lingui/core/macro";
import { format } from "date-fns";
import { HiOutlineXMark } from "react-icons/hi2";

import DateSelector from "~/components/DateSelector";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import { invalidateCard } from "~/utils/cardInvalidation";

export function CardContextDueDateModal() {
  const { entityId: cardPublicId, closeModal } = useModal();
  const utils = api.useUtils();
  const { showPopup } = usePopup();
  const { workspace } = useWorkspace();

  const { data: card, isLoading } = api.card.byId.useQuery(
    { cardPublicId: cardPublicId ?? "" },
    { enabled: !!cardPublicId && cardPublicId.length >= 12 },
  );

  const updateDueDate = api.card.update.useMutation({
    onMutate: async (update) => {
      await utils.card.byId.cancel();
      const previousCard = utils.card.byId.getData({
        cardPublicId: cardPublicId ?? "",
      });

      utils.card.byId.setData(
        { cardPublicId: cardPublicId ?? "" },
        (oldCard) => {
          if (!oldCard) return oldCard;
          return {
            ...oldCard,
            dueDate:
              update.dueDate !== undefined
                ? (update.dueDate as Date | null)
                : oldCard.dueDate,
          };
        },
      );

      return { previousCard };
    },
    onError: (_error, _update, context) => {
      utils.card.byId.setData(
        { cardPublicId: cardPublicId ?? "" },
        context?.previousCard,
      );
      showPopup({
        header: t`Unable to update due date`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      if (cardPublicId) await invalidateCard(utils, cardPublicId);
      await utils.board.byId.invalidate();
    },
  });

  const dueDate = card?.dueDate ?? null;

  const handleDateSelect = (date: Date | undefined) => {
    if (!cardPublicId) return;
    updateDueDate.mutate({ cardPublicId, dueDate: date ?? null });
  };

  const handleClear = () => {
    if (!cardPublicId) return;
    updateDueDate.mutate({ cardPublicId, dueDate: null });
  };

  if (!cardPublicId) return null;

  return (
    <div className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-light-1000 dark:text-dark-1000">
          {t`Set due date`}
        </h2>
        {dueDate && (
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1 rounded-md border border-light-300 bg-light-50 px-2 py-1 text-xs font-medium text-light-1000 hover:bg-light-200 dark:border-dark-400 dark:bg-dark-200 dark:text-dark-1000 dark:hover:bg-dark-300"
          >
            <HiOutlineXMark className="h-3.5 w-3.5" />
            {t`Clear`}
          </button>
        )}
      </div>

      <p className="mb-2 text-xs text-light-900 dark:text-dark-800">
        {dueDate
          ? t`Due ${format(dueDate, "MMM d, yyyy")}`
          : t`No due date set.`}
      </p>

      {isLoading ? (
        <div className="h-[300px] w-full animate-pulse rounded bg-light-200 dark:bg-dark-300" />
      ) : (
        <div className="flex justify-center">
          <DateSelector
            selectedDate={dueDate ?? undefined}
            onDateSelect={handleDateSelect}
            weekStartsOn={workspace.weekStartDay}
          />
        </div>
      )}

      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={closeModal}
          className="rounded-md border border-light-300 bg-light-50 px-3 py-1.5 text-sm font-medium text-light-1000 hover:bg-light-200 dark:border-dark-400 dark:bg-dark-200 dark:text-dark-1000 dark:hover:bg-dark-300"
        >
          {t`Done`}
        </button>
      </div>
    </div>
  );
}
