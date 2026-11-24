import { t } from "@lingui/core/macro";

import { useDeleteChecklist } from "@kan/api-client/hooks";

import Button from "~/components/Button";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useCardCache } from "~/utils/cardCache";
import { invalidateCard } from "~/utils/cardInvalidation";

export function DeleteChecklistConfirmation({
  cardPublicId,
  checklistPublicId,
}: {
  cardPublicId: string;
  checklistPublicId: string;
}) {
  const { closeModal } = useModal();
  const { showPopup } = usePopup();
  const cardCache = useCardCache();

  const deleteChecklist = useDeleteChecklist({
    mutation: {
      onMutate: async () => {
        await cardCache.byId.cancel({ cardPublicId });
        const previous = cardCache.byId.getData({ cardPublicId });
        cardCache.byId.setData({ cardPublicId }, (old) => {
          if (!old) return old;
          const updatedChecklists = old.checklists.filter(
            (cl) => cl.publicId !== checklistPublicId,
          );
          return { ...old, checklists: updatedChecklists };
        });
        return { previous };
      },
      onError: (_err, _vars, ctx) => {
        if (ctx?.previous)
          cardCache.byId.setData({ cardPublicId }, ctx.previous);
        showPopup({
          header: t`Unable to delete checklist`,
          message: t`Please try again later, or contact customer support.`,
          icon: "error",
        });
      },
      onSettled: async () => {
        closeModal();
        await invalidateCard(cardCache, cardPublicId);
      },
    },
  });

  const handleDelete = () => {
    deleteChecklist.mutate({ checklistPublicId });
  };

  return (
    <div className="p-5">
      <div className="flex w-full flex-col justify-between">
        <h2 className="pb-2 text-sm font-semibold text-neutral-900 dark:text-dark-1000">
          {t`Are you sure you want to delete this checklist?`}
        </h2>
        <p className="text-sm text-light-900 dark:text-dark-900">
          {t`This action can't be undone.`}
        </p>
      </div>
      <div className="mt-5 flex justify-end space-x-2">
        <Button size="sm" variant="secondary" onClick={() => closeModal()}>
          {t`Cancel`}
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={handleDelete}
          isLoading={deleteChecklist.isPending}
        >
          {t`Delete`}
        </Button>
      </div>
    </div>
  );
}
