import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { CardDragData } from "../dnd/types";
import type { BoardCard } from "../types";
import CardPreview from "./CardPreview";

interface SortableCardProps {
  card: BoardCard;
  listPublicId: string;
  cardPrefix: string;
  cardHref: string;
  canEditCard: boolean;
}

export default function SortableCard({
  card,
  listPublicId,
  cardPrefix,
  cardHref,
  canEditCard,
}: SortableCardProps) {
  const isPlaceholder = card.publicId.startsWith("PLACEHOLDER");

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.publicId,
    data: { type: "CARD", listPublicId } satisfies CardDragData,
    disabled: !canEditCard || isPlaceholder,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <Link
      data-board-draggable
      data-card-id={card.publicId}
      onClick={(e) => {
        if (isPlaceholder) e.preventDefault();
      }}
      href={cardHref}
      className={`mb-2 flex flex-col ${
        isPlaceholder ? "pointer-events-none" : ""
      } ${
        canEditCard && !isPlaceholder && isDragging
          ? "cursor-grabbing"
          : "cursor-pointer"
      }`}
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <CardPreview card={card} cardPrefix={cardPrefix} />
    </Link>
  );
}
