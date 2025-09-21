import { t } from "@lingui/core/macro";

import Button from "~/components/Button";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

interface DeleteCardConfirmationProps {
  cardPublicId: string;
  boardPublicId: string;
}

export function DeleteCardConfirmation({
  cardPublicId,
  boardPublicId,
}: DeleteCardConfirmationProps) {
  const { closeModal } = useModal();
  const utils = api.useUtils();
  const { showPopup } = usePopup();

  const queryParams = {
    boardPublicId,
  };

  const deleteCardMutation = api.card.delete.useMutation({
    onMutate: async (args) => {
      await utils.board.byId.cancel();

      const currentState = utils.board.byId.getData(queryParams);

      utils.board.byId.setData(queryParams, (oldBoard) => {
        if (!oldBoard) return oldBoard;

        const updatedLists = oldBoard.lists.map((list) => {
          const updatedCards = list.cards.filter(
            (card) => card.publicId !== args.cardPublicId,
          );
          return { ...list, cards: updatedCards };
        });

        return { ...oldBoard, lists: updatedLists };
      });

      // Also clear the card query so the card page's useEffect can redirect immediately
      await utils.card.byId.cancel({ cardPublicId: args.cardPublicId });
      utils.card.byId.setData({ cardPublicId: args.cardPublicId }, undefined);

      return { previousState: currentState };
    },
    onError: (_error, _newList, context) => {
      utils.board.byId.setData(queryParams, context?.previousState);
      showPopup({
        header: t`Unable to delete card`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSuccess: async () => {
      // no-op; page-level effects and SSE handle redirects and cache
    },
    onSettled: async () => {
      closeModal();
      await utils.board.byId.invalidate(queryParams);
    },
  });

  const handleDeleteCard = () => {
    deleteCardMutation.mutate({
      cardPublicId,
    });
  };

  return (
    <div className="p-5">
      <div className="flex w-full flex-col justify-between pb-4">
        <h2 className="text-md pb-4 font-medium text-neutral-900 dark:text-dark-1000">
          {t`Are you sure you want to delete this card?`}
        </h2>
        <p className="text-sm font-medium text-light-900 dark:text-dark-900">
          {t`This action can't be undone.`}
        </p>
      </div>
      <div className="mt-5 flex justify-end sm:mt-6">
        <button
          className="mr-4 inline-flex justify-center rounded-md border-[1px] border-light-600 bg-light-50 px-3 py-2 text-sm font-semibold text-neutral-900 shadow-sm focus-visible:outline-none dark:border-dark-600 dark:bg-dark-300 dark:text-dark-1000"
          onClick={() => closeModal()}
        >
          {t`Cancel`}
        </button>
        <Button
          onClick={handleDeleteCard}
          isLoading={deleteCardMutation.isPending}
        >
          {t`Delete`}
        </Button>
      </div>
    </div>
  );
}
