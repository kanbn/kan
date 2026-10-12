import type { NextRouter } from "next/router";
import type { RefObject } from "react";
import { useEffect, useRef } from "react";

interface BoardScrollPosition {
  left: number;
  lists: Map<string, number>;
}

const scrollPositions = new Map<string, BoardScrollPosition>();

export function useScrollRestore(
  boardId: string | null | undefined,
  scrollRef: RefObject<HTMLElement | null>,
  router: NextRouter,
  isReady: boolean,
) {
  const restored = useRef(false);

  useEffect(() => {
    if (!boardId) return;

    restored.current = false;

    const saveScrollPosition = () => {
      if (scrollRef.current) {
        const lists = new Map<string, number>();
        scrollRef.current
          .querySelectorAll<HTMLElement>("[data-list-scroll-id]")
          .forEach((list) => {
            const listId = list.dataset.listScrollId;
            if (listId) lists.set(listId, list.scrollTop);
          });
        scrollPositions.set(boardId, {
          left: scrollRef.current.scrollLeft,
          lists,
        });
      }
    };

    router.events.on("routeChangeStart", saveScrollPosition);
    return () => router.events.off("routeChangeStart", saveScrollPosition);
  }, [boardId, router.events, scrollRef]);

  useEffect(() => {
    if (restored.current || !isReady || !boardId) return;
    restored.current = true;

    const saved = scrollPositions.get(boardId);
    if (saved === undefined) return;

    const container = scrollRef.current;
    if (!container) return;

    let frame: number | undefined;
    const restore = () => {
      const lists = container.querySelectorAll<HTMLElement>(
        "[data-list-scroll-id]",
      );
      if (lists.length === 0) return;

      observer.disconnect();
      frame = requestAnimationFrame(() => {
        container.scrollLeft = saved.left;
        lists.forEach((list) => {
          const top = saved.lists.get(list.dataset.listScrollId ?? "");
          if (top !== undefined) list.scrollTop = top;
        });
      });
    };

    const observer = new MutationObserver(restore);
    observer.observe(container, { childList: true, subtree: true });
    restore();

    return () => {
      observer.disconnect();
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }, [isReady, scrollRef, boardId]);
}
