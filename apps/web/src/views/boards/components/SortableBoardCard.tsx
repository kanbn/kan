import type { AnimateLayoutChanges } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { HiOutlineStar, HiStar } from "react-icons/hi2";

import PatternedBackground from "~/components/PatternedBackground";

// Disable dnd-kit's layout-change (FLIP) animation. When the list reorders after
// a drop, the optimistic data already puts cards in the right slots; letting
// dnd-kit also FLIP-animate the change makes displaced cards fly in from the
// grid container's corner (its rect measurement ignores grid gap/padding).
const animateLayoutChanges: AnimateLayoutChanges = () => false;

interface SortableBoardCardProps {
  board: {
    publicId: string;
    name: string;
    favorite: boolean;
  };
  onOpen: (
    e: React.MouseEvent | React.KeyboardEvent,
    boardPublicId: string,
  ) => void;
  onToggleFavorite: (
    e: React.MouseEvent,
    boardPublicId: string,
    currentFavorite: boolean | undefined,
  ) => void;
}

export function SortableBoardCard({
  board,
  onOpen,
  onToggleFavorite,
}: SortableBoardCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: board.publicId, animateLayoutChanges });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  // Navigation is programmatic (no anchor): an `<a>` initiates the browser's
  // native link navigation/drag during a pointer drag, which fires before
  // dnd-kit's drag-end and cannot be reliably cancelled. `onOpen` is gated on
  // the drag flag in the parent.
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => onOpen(e, board.publicId)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onOpen(e, board.publicId);
        }}
        className="group relative mr-5 flex h-[150px] w-full cursor-pointer items-center justify-center rounded-md border border-dashed border-light-400 bg-light-50 shadow-sm hover:bg-light-200 dark:border-dark-600 dark:bg-dark-50 dark:hover:bg-dark-100"
      >
        <PatternedBackground />
        <button
          onClick={(e) => onToggleFavorite(e, board.publicId, board.favorite)}
          className={`absolute right-3 top-3 z-10 rounded p-1 transition-all hover:bg-light-300 dark:hover:bg-dark-200 ${
            board.favorite ? "" : "md:opacity-0 md:group-hover:opacity-100"
          }`}
          aria-label={
            board.favorite ? "Remove from favorites" : "Add to favorites"
          }
        >
          {board.favorite ? (
            <HiStar className="h-5 w-5 text-neutral-700 dark:text-dark-1000" />
          ) : (
            <HiOutlineStar className="h-5 w-5 text-neutral-700 dark:text-dark-800" />
          )}
        </button>
        <p className="px-4 text-[14px] font-bold text-neutral-700 dark:text-dark-1000">
          {board.name}
        </p>
      </div>
    </div>
  );
}
