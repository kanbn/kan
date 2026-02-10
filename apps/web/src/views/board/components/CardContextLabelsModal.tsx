import { t } from "@lingui/core/macro";

import { useModal } from "~/providers/modal";
import { api } from "~/utils/api";
import LabelIcon from "~/components/LabelIcon";
import LabelSelector from "~/views/card/components/LabelSelector";

export function CardContextLabelsModal() {
  const { entityId: cardPublicId, closeModal } = useModal();

  const { data: card, isLoading } = api.card.byId.useQuery(
    { cardPublicId: cardPublicId ?? "" },
    { enabled: !!cardPublicId && cardPublicId.length >= 12 },
  );

  const boardLabels = card?.list?.board?.labels ?? [];
  const selectedLabels = card?.labels ?? [];

  const formattedLabels = boardLabels.map((label) => ({
    key: label.publicId,
    value: label.name,
    selected: selectedLabels.some((l) => l.publicId === label.publicId),
    leftIcon: <LabelIcon colourCode={label.colourCode} />,
  }));

  if (!cardPublicId) return null;

  return (
    <div className="p-4">
      <h2 className="mb-4 text-lg font-semibold text-light-1000 dark:text-dark-1000">
        {t`Labels`}
      </h2>
      {isLoading ? (
        <div className="h-10 w-full animate-pulse rounded bg-light-200 dark:bg-dark-300" />
      ) : (
        <LabelSelector
          cardPublicId={cardPublicId}
          labels={formattedLabels}
          isLoading={isLoading}
        />
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
