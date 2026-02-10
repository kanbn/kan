import { t } from "@lingui/core/macro";

import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";
import { invalidateCard } from "~/utils/cardInvalidation";

export function CardContextMoveListModal() {
  const { entityId: cardPublicId, closeModal } = useModal();
  const { showPopup } = usePopup();
  const utils = api.useUtils();

  const { data: card, isLoading } = api.card.byId.useQuery(
    { cardPublicId: cardPublicId ?? "" },
    { enabled: !!cardPublicId && cardPublicId.length >= 12 },
  );

  const updateCardList = api.card.update.useMutation({
    onMutate: async (vars) => {
      if (!cardPublicId) return undefined;
      await utils.card.byId.cancel();
      const previous = utils.card.byId.getData({ cardPublicId });
      utils.card.byId.setData({ cardPublicId }, (old) => {
        if (!old) return old;
        const list = old.list.board?.lists?.find(
          (l) => l.publicId === vars.listPublicId,
        );
        if (!list) return old;
        return {
          ...old,
          list: { ...old.list, publicId: list.publicId, name: list.name },
        };
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (cardPublicId && ctx?.previous) {
        utils.card.byId.setData({ cardPublicId }, ctx.previous);
      }
      showPopup({
        header: t`Unable to move card`,
        message: t`Please try again.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      if (cardPublicId) {
        await invalidateCard(utils, cardPublicId);
        await utils.board.byId.invalidate();
      }
    },
  });

  const lists = card?.list?.board?.lists ?? [];
  const currentListPublicId = card?.list?.publicId;

  const handleSelectList = (listPublicId: string) => {
    if (listPublicId === currentListPublicId || !cardPublicId) return;
    updateCardList.mutate(
      { cardPublicId, listPublicId, index: 0 },
      { onSuccess: closeModal },
    );
  };

  if (!cardPublicId) return null;

  return (
    <div className="p-4">
      <h2 className="mb-4 text-lg font-semibold text-light-1000 dark:text-dark-1000">
        {t`Move to list`}
      </h2>
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-10 w-full animate-pulse rounded bg-light-200 dark:bg-dark-300"
            />
          ))}
        </div>
      ) : (
        <div className="max-h-[60vh] overflow-y-auto pr-1 scrollbar scrollbar-track-rounded-[4px] scrollbar-thumb-rounded-[4px] scrollbar-w-[8px] dark:scrollbar-track-dark-100 dark:scrollbar-thumb-dark-600">
          <ul className="space-y-1">
            {lists.map((list) => (
              <li key={list.publicId}>
                <button
                  type="button"
                  onClick={() => handleSelectList(list.publicId)}
                  disabled={list.publicId === currentListPublicId}
                  className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-light-200 disabled:opacity-50 dark:hover:bg-dark-400"
                >
                  {list.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
