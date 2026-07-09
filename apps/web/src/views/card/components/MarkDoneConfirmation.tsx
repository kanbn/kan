import { t } from "@lingui/core/macro";

import Button from "~/components/Button";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";
import { invalidateCard } from "~/utils/cardInvalidation";

interface MarkDoneConfirmationProps {
  cardPublicId: string;
  /** Public id of the board's Done list, if one exists. */
  doneListPublicId?: string;
}

/**
 * First popout: confirm the card is really done.
 * On confirm, marks the card done and — if a Done list exists — opens the
 * "move to Done list" follow-up popout.
 */
export function MarkDoneConfirmation({
  cardPublicId,
  doneListPublicId,
}: MarkDoneConfirmationProps) {
  const { closeModal, openModal } = useModal();
  const utils = api.useUtils();
  const { showPopup } = usePopup();

  const markDone = api.card.update.useMutation({
    onMutate: async () => {
      await utils.card.byId.cancel({ cardPublicId });
      const previous = utils.card.byId.getData({ cardPublicId });
      utils.card.byId.setData({ cardPublicId }, (old) =>
        old ? { ...old, isDone: true } : old,
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous)
        utils.card.byId.setData({ cardPublicId }, ctx.previous);
      showPopup({
        header: t`Unable to mark card as done`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      await invalidateCard(utils, cardPublicId);
      // The card is also repositioned to the bottom of its list when marked
      // done, so refresh the board view to reflect the new order.
      await utils.board.byId.invalidate();
    },
  });

  const handleConfirm = () => {
    markDone.mutate({ cardPublicId, isDone: true });
    closeModal();
    if (doneListPublicId) {
      openModal("MOVE_TO_DONE_LIST", cardPublicId, doneListPublicId);
    }
  };

  return (
    <div className="p-5">
      <div className="flex w-full flex-col justify-between pb-4">
        <h2 className="text-md pb-4 font-medium text-neutral-900 dark:text-dark-1000">
          {t`Mark this card as done?`}
        </h2>
        <p className="text-sm font-medium text-light-900 dark:text-dark-900">
          {t`The card will be shown as completed on the board.`}
        </p>
      </div>
      <div className="mt-5 flex justify-end sm:mt-6">
        <button
          className="mr-4 inline-flex justify-center rounded-md border-[1px] border-light-600 bg-light-50 px-3 py-2 text-sm font-semibold text-neutral-900 shadow-sm focus-visible:outline-none dark:border-dark-600 dark:bg-dark-300 dark:text-dark-1000"
          onClick={() => closeModal()}
        >
          {t`Cancel`}
        </button>
        <Button onClick={handleConfirm} isLoading={markDone.isPending}>
          {t`Mark as done`}
        </Button>
      </div>
    </div>
  );
}
