import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import ChecklistItemRow from "./ChecklistItemRow";

interface ChecklistItem {
  publicId: string;
  title: string;
  completed: boolean;
  clientId?: string;
}

interface SortableChecklistItemRowProps {
  item: ChecklistItem;
  cardPublicId: string;
  onCreateNewItem: () => void;
  viewOnly: boolean;
}

export default function SortableChecklistItemRow({
  item,
  cardPublicId,
  onCreateNewItem,
  viewOnly,
}: SortableChecklistItemRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.publicId,
    disabled: viewOnly,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ChecklistItemRow
        item={item}
        cardPublicId={cardPublicId}
        onCreateNewItem={onCreateNewItem}
        viewOnly={viewOnly}
        dragHandleAttributes={attributes}
        dragHandleListeners={listeners}
        isDragging={isDragging}
      />
    </div>
  );
}
