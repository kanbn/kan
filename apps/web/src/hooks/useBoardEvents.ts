import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { env } from "@kan/shared/env";

import { useBoardCache } from "~/utils/boardCache";
import { watchBoard } from "~/utils/boardEvents";
import { useCardCache } from "~/utils/cardCache";
import { invalidateCard } from "~/utils/cardInvalidation";

// Keeps a board, and the cards on it, up to date while the tab is visible.
// Coming back to the tab already refetches what's on screen.
export function useBoardEvents(boardPublicId: string | undefined) {
  const queryClient = useQueryClient();
  const boardCache = useBoardCache();
  const cardCache = useCardCache();
  const caches = useRef({ boardCache, cardCache });

  useEffect(() => {
    caches.current = { boardCache, cardCache };
  });

  useEffect(() => {
    if (!boardPublicId || boardPublicId.length < 12) return;

    const baseUrl = env("NEXT_PUBLIC_API_BASE_URL") ?? "/api/v1";
    let isPointerDown = false;
    let stop: (() => void) | undefined;

    const update = () => {
      stop?.();
      stop = undefined;
      if (document.visibilityState !== "visible") return;

      stop = watchBoard(`${baseUrl}/boards/${boardPublicId}/events`, {
        // Don't move things under a drag or undo a change being saved.
        isBusy: () => isPointerDown || queryClient.isMutating() > 0,
        onChange: ({ cardPublicIds, everything }) => {
          const { boardCache, cardCache } = caches.current;
          void boardCache.invalidate(boardPublicId);
          if (everything) void cardCache.byId.invalidate();
          for (const cardPublicId of cardPublicIds)
            void invalidateCard(cardCache, cardPublicId);
        },
      });
    };

    // On move too, as a release can be missed, such as over the browser's menu.
    const onPointer = (event: PointerEvent) =>
      (isPointerDown = event.buttons !== 0);
    const pointerEvents = [
      "pointerdown",
      "pointermove",
      "pointerup",
      "pointercancel",
    ] as const;

    update();
    document.addEventListener("visibilitychange", update);
    for (const name of pointerEvents)
      window.addEventListener(name, onPointer, true);
    return () => {
      stop?.();
      document.removeEventListener("visibilitychange", update);
      for (const name of pointerEvents)
        window.removeEventListener(name, onPointer, true);
    };
  }, [boardPublicId, queryClient]);
}
