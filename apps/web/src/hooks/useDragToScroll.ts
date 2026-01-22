import { useEffect, useRef, useState } from "react";

interface UseDragToScrollOptions {
  /**
   * Whether drag-to-scroll is enabled
   */
  enabled?: boolean;
  /**
   * The direction to scroll
   */
  direction?: "horizontal" | "vertical" | "both";
}

/**
 * Hook to enable drag-to-scroll functionality on a scrollable element
 * @param options Configuration options
 * @returns Ref to attach to the scrollable element and mouse event handlers
 */
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

    // Check if the click is on an interactive or draggable element
    // We need to be careful not to interfere with react-beautiful-dnd dragging
    const isInteractiveElement =
      target.closest("a") ||
      target.closest("button") ||
      target.closest("input") ||
      target.closest("textarea") ||
      target.closest("[role='button']") ||
      target.closest("[draggable='true']") ||
      target.closest(".react-beautiful-dnd-drag-handle") ||
      target.closest("[data-rbd-drag-handle-draggable-id]") ||
      target.closest("[data-rbd-draggable-id]");

    // Don't start dragging if clicking on interactive elements
    if (isInteractiveElement) return;

    // Check if clicking directly on the container (background)
    const isContainer = target === container;
    
    // Check if clicking on a spacer div (empty space between lists)
    // Spacer divs are direct children with minimal/no content
    const isDirectChild = container.contains(target) && target.parentElement === container;
    const isSpacer = 
      isDirectChild &&
      target.textContent?.trim() === "" &&
      target.children.length === 0 &&
      !target.closest("[data-rbd-droppable-id]");

    // Allow dragging if clicking on the container background or spacer elements
    if (isContainer || isSpacer) {
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
