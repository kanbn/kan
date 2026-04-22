import { t } from "@lingui/core/macro";
import { HiMiniPlus } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import LabelIcon from "~/components/LabelIcon";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";
import { invalidateCard } from "~/utils/cardInvalidation";

export function CardContextLabelsModal() {
  const { entityId: cardPublicId, closeModal, openModal } = useModal();
  const utils = api.useUtils();
  const { showPopup } = usePopup();

  const { data: card, isLoading } = api.card.byId.useQuery(
    { cardPublicId: cardPublicId ?? "" },
    { enabled: !!cardPublicId && cardPublicId.length >= 12 },
  );

  const boardLabels = card?.list?.board?.labels ?? [];
  const selectedLabelIds = new Set((card?.labels ?? []).map((l) => l.publicId));

  const addOrRemoveLabel = api.card.addOrRemoveLabel.useMutation({
    onMutate: async (update) => {
      await utils.card.byId.cancel();
      const previousCard = utils.card.byId.getData({
        cardPublicId: cardPublicId ?? "",
      });

      utils.card.byId.setData(
        { cardPublicId: cardPublicId ?? "" },
        (oldCard) => {
          if (!oldCard) return oldCard;

          const hasLabel = oldCard.labels.some(
            (label) => label.publicId === update.labelPublicId,
          );

          const boardLabel = oldCard.list.board.labels.find(
            (label) => label.publicId === update.labelPublicId,
          );

          const updatedLabels = hasLabel
            ? oldCard.labels.filter(
                (label) => label.publicId !== update.labelPublicId,
              )
            : [
                ...oldCard.labels,
                {
                  publicId: update.labelPublicId,
                  name: boardLabel?.name ?? "",
                  colourCode: boardLabel?.colourCode ?? "",
                },
              ];

          return { ...oldCard, labels: updatedLabels };
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
        header: t`Unable to update labels`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      if (cardPublicId) await invalidateCard(utils, cardPublicId);
      await utils.board.byId.invalidate();
    },
  });

  if (!cardPublicId) return null;

  return (
    <div className="p-4">
      <h2 className="mb-4 text-lg font-semibold text-light-1000 dark:text-dark-1000">
        {t`Labels`}
      </h2>

      {isLoading ? (
        <div className="h-10 w-full animate-pulse rounded bg-light-200 dark:bg-dark-300" />
      ) : boardLabels.length === 0 ? (
        <p className="mb-4 text-sm text-light-900 dark:text-dark-800">
          {t`No labels on this board yet.`}
        </p>
      ) : (
        <div className="mb-4 flex flex-wrap gap-2">
          {boardLabels.map((label) => {
            const isSelected = selectedLabelIds.has(label.publicId);
            return (
              <button
                key={label.publicId}
                type="button"
                onClick={() =>
                  addOrRemoveLabel.mutate({
                    cardPublicId,
                    labelPublicId: label.publicId,
                  })
                }
                className={twMerge(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  "ring-1 ring-inset",
                  isSelected
                    ? "bg-light-300 text-neutral-900 ring-light-600 dark:bg-dark-400 dark:text-dark-1000 dark:ring-dark-700"
                    : "text-light-900 ring-light-400 hover:bg-light-200 dark:text-dark-900 dark:ring-dark-500 dark:hover:bg-dark-300",
                )}
              >
                <LabelIcon colourCode={label.colourCode} />
                <span>{label.name}</span>
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => openModal("NEW_LABEL")}
        className="flex w-full items-center gap-1.5 rounded-md border border-dashed border-light-400 px-3 py-2 text-sm text-light-900 hover:bg-light-200 dark:border-dark-500 dark:text-dark-900 dark:hover:bg-dark-300"
      >
        <HiMiniPlus className="h-4 w-4" />
        {t`Create new label`}
      </button>

      <div className="mt-4 flex justify-end">
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
