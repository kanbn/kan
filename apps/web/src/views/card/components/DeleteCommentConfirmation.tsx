import { t } from "@lingui/core/macro";

import Button from "~/components/Button";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";
import { invalidateCard } from "~/utils/cardInvalidation";

interface DeleteCommentConfirmationProps {
  cardPublicId: string;
  commentPublicId: string;
}

export function DeleteCommentConfirmation({
  cardPublicId,
  commentPublicId,
}: DeleteCommentConfirmationProps) {
  const { closeModal } = useModal();
  const utils = api.useUtils();
  const { showPopup } = usePopup();

  const queryParams = {
    cardPublicId,
  };

  const deleteCommentMutation = api.card.deleteComment.useMutation({
    onMutate: async (args) => {
      closeModal();
      await utils.card.byId.cancel();
      const currentState = utils.card.byId.getData(queryParams);

      utils.card.byId.setData(queryParams, (oldCard) => {
        if (!oldCard) return oldCard;
        const updatedActivities = oldCard.activities.filter(
          (activity) => activity.comment?.publicId !== args.commentPublicId,
        );
        return { ...oldCard, activities: updatedActivities };
      });

      return { previousState: currentState };
    },
    onError: (_error, _newList, context) => {
      utils.card.byId.setData(queryParams, context?.previousState);
      showPopup({
        header: t`Unable to delete comment`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      await invalidateCard(utils, cardPublicId);
    },
  });

  const handleDeleteComment = () => {
    deleteCommentMutation.mutate({
      cardPublicId,
      commentPublicId,
    });
  };

  return (
    <div className="p-5">
      <div className="flex w-full flex-col justify-between pb-4">
        <h2 className="text-md pb-4 font-medium text-neutral-900 dark:text-dark-1000">
          {t`Are you sure you want to delete this comment?`}
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
          onClick={handleDeleteComment}
          isLoading={deleteCommentMutation.isPending}
        >
          {t`Delete`}
        </Button>
      </div>
    </div>
  );
}
