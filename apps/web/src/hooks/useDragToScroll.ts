import { useEffect, useRef, useState } from "react";

interface UseDragToScrollOptions {
  enabled?: boolean;
  direction?: "horizontal" | "vertical" | "both";
}

export function useDragToScroll({
  enabled = true,
  direction = "horizontal",
}: UseDragToScrollOptions = {}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const scrollStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!enabled || !isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!scrollRef.current) return;

      const deltaX = e.clientX - startPosRef.current.x;
      const deltaY = e.clientY - startPosRef.current.y;

      if (direction === "horizontal" || direction === "both") {
        scrollRef.current.scrollLeft = scrollStartRef.current.x - deltaX;
      }
      if (direction === "vertical" || direction === "both") {
        scrollRef.current.scrollTop = scrollStartRef.current.y - deltaY;
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [enabled, isDragging, direction]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;

    const target = e.target as HTMLElement;
    const container = scrollRef.current;

    // Leave clicks on controls and dnd-kit draggables alone.
    const isInteractiveElement =
      target.closest("a") ??
      target.closest("button") ??
      target.closest("input") ??
      target.closest("textarea") ??
      target.closest("[role='button']") ??
      target.closest("[draggable='true']") ??
      target.closest("[data-board-draggable]");

    if (isInteractiveElement) return;

    if (container.contains(target)) {
      e.preventDefault();
      setIsDragging(true);
      startPosRef.current = { x: e.clientX, y: e.clientY };
      scrollStartRef.current = {
        x: container.scrollLeft,
        y: container.scrollTop,
      };
    }
  };

  return {
    ref: scrollRef,
    onMouseDown: handleMouseDown,
    isDragging,
  };
}
