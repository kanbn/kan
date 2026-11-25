import { t } from "@lingui/core/macro";

import { useArchiveCard, useUnarchiveCard } from "@kan/api-client/hooks";

import { usePopup } from "~/providers/popup";
import { useBoardCache } from "~/utils/boardCache";
import { useCardCache } from "~/utils/cardCache";
import { invalidateCard } from "~/utils/cardInvalidation";

export function useCardArchive() {
  const boardCache = useBoardCache();
  const cardCache = useCardCache();
  const { showPopup } = usePopup();

  const onSettled = (
    _data: unknown,
    _error: unknown,
    { cardPublicId }: { cardPublicId: string },
  ) =>
    Promise.all([
      boardCache.invalidate(),
      invalidateCard(cardCache, cardPublicId),
    ]);

  const onError = (error: unknown) =>
    showPopup({
      header: t`Unable to update card`,
      message:
        error instanceof Error
          ? error.message
          : t`Please try again later, or contact customer support.`,
      icon: "error",
    });

  const archive = useArchiveCard({
    mutation: {
      onSuccess: () =>
        showPopup({
          header: t`Card archived`,
          message: t`Find it under Archived cards in the board's menu.`,
          icon: "success",
        }),
      onError,
      onSettled,
    },
  });

  const unarchive = useUnarchiveCard({
    mutation: {
      onSuccess: ({ data }) => {
        const listName = data.list.name;
        showPopup({
          header: t`Card unarchived`,
          message: t`The card is back in ${listName}.`,
          icon: "success",
        });
      },
      onError,
      onSettled,
    },
  });

  return { archive, unarchive };
}
