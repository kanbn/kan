// no hooks needed here currently

import { api } from "../utils/api";

// Subscribe to board-level events via SSE and keep the board cache fresh
export function useBoardEvents(boardPublicId?: string | null) {
  const utils = api.useUtils();

  api.board.events.useSubscription(
    { boardPublicId: boardPublicId ?? "" },
    {
      enabled: !!boardPublicId,
      onData: () => {
        // Invalidate all board.byId queries (covers filtered variants)
        void utils.board.byId.invalidate();
      },
    },
  );
}

// Subscribe to card-level events via SSE and keep the card (and parent board) caches fresh
export function useCardEvents(
  cardPublicId?: string | null,
  boardPublicId?: string | null,
) {
  const utils = api.useUtils();

  api.card.events.useSubscription(
    { cardPublicId: cardPublicId ?? "" },
    {
      enabled: !!cardPublicId,
      onData: (event) => {
        if (typeof cardPublicId !== "string") return;
        const e = event as { type?: string } | null;
        if (e?.type === "deleted") {
          // Clear local cache so the page can detect missing data and redirect via useEffect
          void utils.card.byId.cancel({ cardPublicId });
          utils.card.byId.setData({ cardPublicId }, undefined);
          return;
        }
        // Immediately refetch the card to update activity list without delay
        void utils.card.byId.refetch({ cardPublicId });
        // Also invalidate ALL board.byId queries to refresh list/sidebar counters and card labels/members
        // (covers filtered inputs like members/labels on the board view)
        void utils.board.byId.invalidate();
      },
    },
  );

  // Also listen to board-level events so moves (card.updated) and archives refresh this card view
  api.board.events.useSubscription(
    { boardPublicId: boardPublicId ?? "" },
    {
      enabled: !!boardPublicId && !!cardPublicId,
      onData: (event: unknown) => {
        if (typeof cardPublicId !== "string") return;
        const e = event as { type?: string; cardPublicId?: string } | null;
        if (!e?.type) return;
        if (
          (e.type === "card.updated" || e.type === "card.deleted") &&
          e.cardPublicId === cardPublicId
        ) {
          if (e.type === "card.deleted") {
            // Clear local cache so the page can detect missing data and redirect via useEffect
            void utils.card.byId.cancel({ cardPublicId });
            utils.card.byId.setData({ cardPublicId }, undefined);
            return;
          }
          // Actively refetch to get the latest activities immediately
          void utils.card.byId.refetch({ cardPublicId });
        }
      },
    },
  );
}
