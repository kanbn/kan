import { t } from "@lingui/core/macro";

import Button from "~/components/Button";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";
import { invalidateCard } from "~/utils/cardInvalidation";

interface MoveToDoneListConfirmationProps {
  cardPublicId: string;
  doneListPublicId: string;
}

/**
 * Second popout (only shown when a Done list exists): ask whether to move the
 * newly-completed card into the board's Done list.
 */
export function MoveToDoneListConfirmation({
  cardPublicId,
  doneListPublicId,
}: MoveToDoneListConfirmationProps) {
  const { closeModal } = useModal();
  const utils = api.useUtils();
  const { showPopup } = usePopup();

  const moveCard = api.card.update.useMutation({
    onError: () => {
      showPopup({
        header: t`Unable to move card`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      await invalidateCard(utils, cardPublicId);
      await utils.board.byId.invalidate();
    },
  });

  const handleConfirm = () => {
    moveCard.mutate({ cardPublicId, listPublicId: doneListPublicId });
    closeModal();
  };

  return (
    <div className="p-5">
      <div className="flex w-full flex-col justify-between pb-4">
        <h2 className="text-md pb-4 font-medium text-neutral-900 dark:text-dark-1000">
          {t`Move this card to the Done list?`}
        </h2>
        <p className="text-sm font-medium text-light-900 dark:text-dark-900">
          {t`Keep your completed work organized in one place.`}
        </p>
      </div>
      <div className="mt-5 flex justify-end sm:mt-6">
        <button
          className="mr-4 inline-flex justify-center rounded-md border-[1px] border-light-600 bg-light-50 px-3 py-2 text-sm font-semibold text-neutral-900 shadow-sm focus-visible:outline-none dark:border-dark-600 dark:bg-dark-300 dark:text-dark-1000"
          onClick={() => closeModal()}
        >
          {t`Not now`}
        </button>
        <Button onClick={handleConfirm} isLoading={moveCard.isPending}>
          {t`Move to Done list`}
        </Button>
      </div>
    </div>
  );
}
