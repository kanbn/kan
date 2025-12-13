import type { DropResult } from "react-beautiful-dnd";
import { DragDropContext, Draggable } from "react-beautiful-dnd";
import { HiPlus, HiXMark } from "react-icons/hi2";

import CircularProgress from "~/components/CircularProgress";
import { StrictModeDroppable as Droppable } from "~/components/StrictModeDroppable";
import { useModal } from "~/providers/modal";
import { api } from "~/utils/api";
import ChecklistItemRow from "./ChecklistItemRow";
import ChecklistNameInput from "./ChecklistNameInput";
import NewChecklistItemForm from "./NewChecklistItemForm";

interface ChecklistItem {
  publicId: string;
  title: string;
  completed: boolean;
}

interface Checklist {
  publicId: string;
  name: string;
  items: ChecklistItem[];
}

interface ChecklistsProps {
  checklists: Checklist[];
  cardPublicId: string;
  activeChecklistForm?: string | null;
  setActiveChecklistForm?: (id: string | null) => void;
  viewOnly?: boolean;
}

export default function Checklists({
  checklists,
  cardPublicId,
  activeChecklistForm,
  setActiveChecklistForm,
  viewOnly = false,
}: ChecklistsProps) {
  const { openModal } = useModal();
  const utils = api.useUtils();

  const reorderItemMutation = api.checklist.reorderItem.useMutation({
    onSettled: async () => {
      await utils.card.byId.invalidate({ cardPublicId });
    },
  });

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    if (source.droppableId !== destination.droppableId) return;

    if (source.index === destination.index) return;

    reorderItemMutation.mutate({
      checklistItemPublicId: draggableId,
      index: destination.index,
    });
  };

  if (checklists.length === 0) return null;

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="border-light-300 pb-4 dark:border-dark-300">
        <div>
          {checklists.map((checklist) => {
            const completedItems = checklist.items.filter(
              (item) => item.completed,
            );
            const progress =
              checklist.items.length > 0 && completedItems.length > 0
                ? (completedItems.length / checklist.items.length) * 100
                : 2;

            return (
              <div key={checklist.publicId} className="mb-4">
                <div className="mb-2 flex items-center font-medium text-light-1000 dark:text-dark-1000">
                  <div className="min-w-0 flex-1">
                    <ChecklistNameInput
                      checklistPublicId={checklist.publicId}
                      initialName={checklist.name}
                      cardPublicId={cardPublicId}
                      viewOnly={viewOnly}
                    />
                  </div>
                  {!viewOnly && (
                    <div className="ml-2 flex flex-shrink-0 items-center gap-2">
                      <div className="flex items-center gap-1 rounded-full border-[1px] border-light-300 px-2 py-1 dark:border-dark-300">
                        <CircularProgress
                          progress={progress}
                          size="sm"
                          className="flex-shrink-0"
                        />
                        <span className="text-[11px] text-light-900 dark:text-dark-700">
                          {completedItems.length}/{checklist.items.length}
                        </span>
                      </div>
                      <div>
                        <button
                          className="rounded-md p-1 text-light-900 hover:bg-light-100 dark:text-dark-700 dark:hover:bg-dark-100"
                          onClick={() =>
                            openModal("DELETE_CHECKLIST", checklist.publicId)
                          }
                        >
                          <HiXMark size={16} />
                        </button>
                        <button
                          onClick={() =>
                            setActiveChecklistForm?.(checklist.publicId)
                          }
                          className="rounded-md p-1 text-light-900 hover:bg-light-100 dark:text-dark-700 dark:hover:bg-dark-100"
                        >
                          <HiPlus size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                  {viewOnly && (
                    <div className="ml-2 flex flex-shrink-0 items-center gap-2">
                      <div className="flex items-center gap-1 rounded-full border-[1px] border-light-300 px-2 py-1 dark:border-dark-300">
                        <CircularProgress
                          progress={progress}
                          size="sm"
                          className="flex-shrink-0"
                        />
                        <span className="text-[11px] text-light-900 dark:text-dark-700">
                          {completedItems.length}/{checklist.items.length}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <Droppable
                  droppableId={checklist.publicId}
                  type="CHECKLIST_ITEM"
                  isDropDisabled={viewOnly}
                >
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="ml-1"
                    >
                      {checklist.items.map((item, index) => (
                        <Draggable
                          key={item.publicId}
                          draggableId={item.publicId}
                          index={index}
                          isDragDisabled={viewOnly}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              style={{
                                ...provided.draggableProps.style,
                                opacity: snapshot.isDragging ? 0.8 : 1,
                              }}
                            >
                              <ChecklistItemRow
                                item={{
                                  publicId: item.publicId,
                                  title: item.title,
                                  completed: item.completed,
                                }}
                                cardPublicId={cardPublicId}
                                viewOnly={viewOnly}
                                dragHandleProps={provided.dragHandleProps}
                                isDragging={snapshot.isDragging}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
                {activeChecklistForm === checklist.publicId && !viewOnly && (
                  <div className="ml-1">
                    <NewChecklistItemForm
                      checklistPublicId={checklist.publicId}
                      cardPublicId={cardPublicId}
                      onCancel={() => setActiveChecklistForm?.(null)}
                      readOnly={viewOnly}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </DragDropContext>
  );
}
