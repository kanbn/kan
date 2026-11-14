import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from "@dnd-kit/core";
import { t } from "@lingui/core/macro";
import { useState } from "react";
import { HiXMark } from "react-icons/hi2";
import { RiDraggable } from "react-icons/ri";
import { twMerge } from "tailwind-merge";

import {
  useDeleteChecklistItem,
  useUpdateChecklistItem,
} from "@kan/api-client/hooks";

import PlainTextEditor from "~/components/PlainTextEditor";
import { usePopup } from "~/providers/popup";
import { useCardCache } from "~/utils/cardCache";
import { invalidateCard } from "~/utils/cardInvalidation";

interface ChecklistItemRowProps {
  item: {
    publicId: string;
    title: string;
    completed: boolean;
    clientId?: string;
  };
  cardPublicId: string;
  onCreateNewItem?: () => void;
  viewOnly?: boolean;
  dragHandleAttributes?: DraggableAttributes;
  dragHandleListeners?: DraggableSyntheticListeners;
  isDragging?: boolean;
}

export default function ChecklistItemRow({
  item,
  cardPublicId,
  onCreateNewItem,
  viewOnly = false,
  dragHandleAttributes,
  dragHandleListeners,
  isDragging = false,
}: ChecklistItemRowProps) {
  const cardCache = useCardCache();
  const { showPopup } = usePopup();
  const [completed, setCompleted] = useState(item.completed);

  const updateItem = useUpdateChecklistItem({
    mutation: {
      onMutate: async (vars) => {
        await cardCache.byId.cancel({ cardPublicId });
        const previous = cardCache.byId.getData({ cardPublicId });
        cardCache.byId.setData({ cardPublicId }, (old) => {
          if (!old) return old;
          const updatedChecklists = old.checklists.map((cl) => ({
            ...cl,
            items: cl.items.map((ci) =>
              ci.publicId === item.publicId
                ? {
                    ...ci,
                    ...(vars.data.title !== undefined
                      ? { title: vars.data.title }
                      : {}),
                    ...(vars.data.completed !== undefined
                      ? { completed: vars.data.completed }
                      : {}),
                  }
                : ci,
            ),
          }));
          return { ...old, checklists: updatedChecklists };
        });
        return { previous };
      },
      onError: (_err, _vars, ctx) => {
        if (ctx?.previous)
          cardCache.byId.setData({ cardPublicId }, ctx.previous);
        showPopup({
          header: t`Unable to update checklist item`,
          message: t`Please try again later, or contact customer support.`,
          icon: "error",
        });
      },
      onSettled: async () => {
        await invalidateCard(cardCache, cardPublicId);
      },
    },
  });

  const deleteItem = useDeleteChecklistItem({
    mutation: {
      onMutate: async () => {
        await cardCache.byId.cancel({ cardPublicId });
        const previous = cardCache.byId.getData({ cardPublicId });
        cardCache.byId.setData({ cardPublicId }, (old) => {
          if (!old) return old;
          const updatedChecklists = old.checklists.map((cl) => ({
            ...cl,
            items: cl.items.filter((ci) => ci.publicId !== item.publicId),
          }));
          return { ...old, checklists: updatedChecklists };
        });
        return { previous };
      },
      onError: (_err, _vars, ctx) => {
        if (ctx?.previous)
          cardCache.byId.setData({ cardPublicId }, ctx.previous);
        showPopup({
          header: t`Unable to delete checklist item`,
          message: t`Please try again later, or contact customer support.`,
          icon: "error",
        });
      },
      onSettled: async () => {
        await invalidateCard(cardCache, cardPublicId);
      },
    },
  });

  const handleToggleCompleted = () => {
    if (viewOnly) return;
    setCompleted((prev) => !prev);
    updateItem.mutate({
      checklistItemPublicId: item.publicId,
      data: { completed: !completed },
    });
  };

  const commitTitle = (plain: string) => {
    if (!plain || plain === item.title) return;
    updateItem.mutate({
      checklistItemPublicId: item.publicId,
      data: { title: plain },
    });
  };

  const handleDelete = () => {
    if (viewOnly) return;
    deleteItem.mutate({ checklistItemPublicId: item.publicId });
  };

  return (
    <div
      className={twMerge(
        "group relative flex items-start gap-3 rounded-md py-2 pl-4 hover:bg-light-100 dark:hover:bg-dark-100",
        isDragging && "opacity-80",
      )}
    >
      {!viewOnly && (
        <div
          {...dragHandleAttributes}
          {...dragHandleListeners}
          className="absolute top-1/2 left-0 flex h-[20px] w-[20px] -translate-x-full -translate-y-1/2 cursor-grab items-center justify-center pr-1 opacity-0 transition-opacity group-hover:opacity-75 hover:opacity-100 active:cursor-grabbing"
        >
          <RiDraggable className="h-4 w-4 text-light-700 dark:text-dark-700" />
        </div>
      )}

      {viewOnly && <div className="w-[20px] shrink-0" />}

      <label
        className={`relative mt-[2px] inline-flex h-[16px] w-[16px] shrink-0 items-center justify-center`}
      >
        <input
          type="checkbox"
          checked={completed}
          onChange={(e) => {
            if (viewOnly) {
              e.preventDefault();
              return;
            }
            handleToggleCompleted();
          }}
          className={twMerge(
            "h-[16px] w-[16px] appearance-none rounded-md border border-light-500 bg-transparent ring-0 outline-hidden checked:bg-blue-600 focus:shadow-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-hidden dark:border-dark-500 dark:hover:border-dark-500",
            viewOnly ? "cursor-default" : "cursor-pointer",
          )}
        />
      </label>

      <div className="flex-1 pr-7">
        <PlainTextEditor
          key={item.clientId ?? item.publicId}
          content={item.title}
          readOnly={viewOnly}
          placeholder={t`Add details...`}
          onBlur={commitTitle}
          onEnter={(plain) => {
            commitTitle(plain);
            onCreateNewItem?.();
          }}
          onEscape={() => undefined}
          className={twMerge(
            "m-0 min-h-[20px] w-full p-0 text-sm leading-[20px] text-light-950 dark:text-dark-950",
            viewOnly && "cursor-default",
          )}
        />
      </div>

      {!viewOnly && (
        <button
          type="button"
          onClick={handleDelete}
          className="absolute top-1/2 right-1 hidden -translate-y-1/2 rounded-md p-1 text-light-900 group-hover:block hover:bg-light-200 dark:text-dark-700 dark:hover:bg-dark-200"
        >
          <HiXMark size={16} />
        </button>
      )}
    </div>
  );
}
