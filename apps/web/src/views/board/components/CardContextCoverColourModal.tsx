import { t } from "@lingui/core/macro";
import { HiCheck, HiXMark } from "react-icons/hi2";

import { colours } from "@kan/shared/constants";

import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";
import { invalidateCard } from "~/utils/cardInvalidation";

export function CardContextCoverColourModal() {
  const { entityId: cardPublicId, closeModal } = useModal();
  const { showPopup } = usePopup();
  const utils = api.useUtils();

  const { data: card, isLoading } = api.card.byId.useQuery(
    { cardPublicId: cardPublicId ?? "" },
    { enabled: !!cardPublicId && cardPublicId.length >= 12 },
  );

  const selectedColour = card?.coverColourCode ?? null;

  const updateCard = api.card.update.useMutation({
    onMutate: async ({ coverColourCode }) => {
      if (!cardPublicId) return;
      await utils.card.byId.cancel({ cardPublicId });

      const previousCard = utils.card.byId.getData({ cardPublicId });

      utils.card.byId.setData({ cardPublicId }, (oldCard) =>
        oldCard
          ? { ...oldCard, coverColourCode: coverColourCode ?? null }
          : oldCard,
      );

      return { previousCard };
    },
    onError: (_error, _vars, context) => {
      if (cardPublicId) {
        utils.card.byId.setData({ cardPublicId }, context?.previousCard);
      }
      showPopup({
        header: t`Unable to update cover colour`,
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

  const setColour = (coverColourCode: string | null) =>
    updateCard.mutate({ cardPublicId, coverColourCode });

  return (
    <div className="p-4">
      <h2 className="mb-4 text-lg font-semibold text-light-1000 dark:text-dark-1000">
        {t`Cover colour`}
      </h2>
      {isLoading ? (
        <div className="h-10 w-full animate-pulse rounded bg-light-200 dark:bg-dark-300" />
      ) : (
        <div className="flex flex-wrap gap-2">
          {/* None / clear */}
          <button
            type="button"
            aria-label={t`No cover colour`}
            onClick={() => setColour(null)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-light-400 bg-light-50 text-light-900 hover:border-light-600 dark:border-dark-400 dark:bg-dark-200 dark:text-dark-900 dark:hover:border-dark-600"
          >
            {selectedColour === null ? (
              <HiCheck className="h-4 w-4" />
            ) : (
              <HiXMark className="h-4 w-4" />
            )}
          </button>
          {colours.map((colour) => {
            const isSelected = selectedColour === colour.code;
            return (
              <button
                key={colour.code}
                type="button"
                aria-label={colour.name}
                title={colour.name}
                onClick={() => setColour(colour.code)}
                style={{ backgroundColor: colour.code }}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 hover:ring-2 hover:ring-light-600 dark:border-white/10 dark:hover:ring-dark-600"
              >
                {isSelected && <HiCheck className="h-4 w-4 text-white" />}
              </button>
            );
          })}
        </div>
      )}
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
