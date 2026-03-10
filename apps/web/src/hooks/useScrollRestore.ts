import type { RefObject } from "react";
import type { NextRouter } from "next/router";
import { useEffect, useRef } from "react";

const scrollPositions = new Map<string, number>();

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
        scrollPositions.set(boardId, scrollRef.current.scrollLeft);
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

    // StrictModeDroppable delays rendering by one requestAnimationFrame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (scrollRef.current) scrollRef.current.scrollLeft = saved;
      });
    });
  }, [isReady, scrollRef, boardId]);
}
