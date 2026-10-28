import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useLayoutEffect, useMemo, useRef, useState } from "react";

import type { ListBodyDragData } from "../dnd/types";
import type { BoardCard } from "../types";
import { isPlaceholderPublicId } from "~/utils/helpers";
import { getListBodyId } from "../dnd/ids";
import SortableCard from "./SortableCard";

interface CardListProps {
  listPublicId: string;
  cards: BoardCard[];
  cardPrefix: string;
  canEditCard: boolean;
  freezeHeight: boolean;
  getCardHref: (cardPublicId: string) => string;
  onContextMenu: (event: React.MouseEvent, cardPublicId: string) => void;
}

export default function CardList({
  listPublicId,
  cards,
  cardPrefix,
  canEditCard,
  freezeHeight,
  getCardHref,
  onContextMenu,
}: CardListProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [minHeightPx, setMinHeightPx] = useState(0);

  useLayoutEffect(() => {
    if (freezeHeight) {
      const measured = containerRef.current?.getBoundingClientRect().height;
      if (measured != null) {
        setMinHeightPx(Math.round(measured));
      }
    } else if (containerRef.current && contentRef.current) {
      const maxHeight = parseFloat(
        getComputedStyle(containerRef.current).maxHeight,
      );
      const natural = Math.min(
        contentRef.current.scrollHeight,
        Number.isNaN(maxHeight) ? Infinity : maxHeight,
      );
      setMinHeightPx(Math.round(natural));
    } else {
      setMinHeightPx(0);
    }
  }, [freezeHeight, cards]);

  const { setNodeRef } = useDroppable({
    id: getListBodyId(listPublicId),
    data: { type: "LIST_BODY", listPublicId } satisfies ListBodyDragData,
    disabled: isPlaceholderPublicId(listPublicId),
  });

  const cardIds = useMemo(() => cards.map((card) => card.publicId), [cards]);

  return (
    <div
      ref={(node) => {
        containerRef.current = node;
        setNodeRef(node);
      }}
      data-list-scroll-id={listPublicId}
      style={{
        minHeight: minHeightPx,
        transition: "min-height 200ms ease-out",
      }}
      onTransitionEnd={(e) => {
        if (e.propertyName === "min-height" && !freezeHeight) {
          setMinHeightPx(0);
        }
      }}
      className="scrollbar-track-rounded-[4px] scrollbar-thumb-rounded-[4px] scrollbar-w-[8px] z-10 max-h-[calc(100dvh-225px)] min-h-[2rem] overflow-y-auto overflow-x-hidden pb-[calc(0.75rem+env(safe-area-inset-bottom))] pr-1 scrollbar dark:scrollbar-track-dark-100 dark:scrollbar-thumb-dark-600"
    >
      <div ref={contentRef}>
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <SortableCard
              key={card.publicId}
              card={card}
              listPublicId={listPublicId}
              cardPrefix={cardPrefix}
              cardHref={getCardHref(card.publicId)}
              canEditCard={canEditCard}
              onContextMenu={onContextMenu}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
