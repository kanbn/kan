import { t } from "@lingui/core/macro";
import { useEffect, useState } from "react";
import ContentEditable from "react-contenteditable";
import { HiXMark } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";
import { invalidateCard } from "~/utils/cardInvalidation";

interface ChecklistItemRowProps {
  item: {
    publicId: string;
    title: string;
    completed: boolean;
  };
  cardPublicId: string;
  viewOnly?: boolean;
}

export default function ChecklistItemRow({
  item,
  cardPublicId,
  viewOnly = false,
}: ChecklistItemRowProps) {
  const utils = api.useUtils();
  const { showPopup } = usePopup();

  const [title, setTitle] = useState("");
  const [completed, setCompleted] = useState(false);

  const updateItem = api.checklist.updateItem.useMutation({
    onMutate: async (vars) => {
      await utils.card.byId.cancel({ cardPublicId });
      const previous = utils.card.byId.getData({ cardPublicId });
      utils.card.byId.setData({ cardPublicId }, (old) => {
        if (!old) return old as any;
        const updatedChecklists = old.checklists.map((cl) => ({
          ...cl,
          items: cl.items.map((ci) =>
            ci.publicId === item.publicId
              ? {
                  ...ci,
                  ...(vars.title !== undefined ? { title: vars.title } : {}),
                  ...(vars.completed !== undefined
                    ? { completed: vars.completed }
                    : {}),
                }
              : ci,
          ),
        }));
        return { ...old, checklists: updatedChecklists } as typeof old;
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous)
        utils.card.byId.setData({ cardPublicId }, ctx.previous);
      showPopup({
        header: t`Unable to update checklist item`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      await invalidateCard(utils, cardPublicId);
    },
  });

  const deleteItem = api.checklist.deleteItem.useMutation({
    onMutate: async () => {
      await utils.card.byId.cancel({ cardPublicId });
      const previous = utils.card.byId.getData({ cardPublicId });
      utils.card.byId.setData({ cardPublicId }, (old) => {
        if (!old) return old as any;
        const updatedChecklists = old.checklists.map((cl) => ({
          ...cl,
          items: cl.items.filter((ci) => ci.publicId !== item.publicId),
        }));
        return { ...old, checklists: updatedChecklists } as typeof old;
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous)
        utils.card.byId.setData({ cardPublicId }, ctx.previous);
      showPopup({
        header: t`Unable to delete checklist item`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      await invalidateCard(utils, cardPublicId);
    },
  });

  // Only resync from props when switching items to avoid clobbering edits
  useEffect(() => {
    setTitle(item.title);
    setCompleted(item.completed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.publicId]);

  const sanitizeHtmlToPlainText = (html: string): string =>
    html
      .replace(/<br\s*\/?>(\n)?/gi, "\n")
      .replace(/<div><br\s*\/?><\/div>/gi, "")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim();

  const handleToggleCompleted = () => {
    if (viewOnly) return;
    setCompleted((prev) => !prev);
    updateItem.mutate({
      checklistItemPublicId: item.publicId,
      completed: !completed,
    });
  };

  const commitTitle = (rawHtml: string) => {
    if (viewOnly) return;
    const plain = sanitizeHtmlToPlainText(rawHtml);
    if (!plain || plain === item.title) {
      setTitle(item.title);
      return;
    }
    setTitle(plain);
    updateItem.mutate({
      checklistItemPublicId: item.publicId,
      title: plain,
    });
  };

  const handleDelete = () => {
    if (viewOnly) return;
    deleteItem.mutate({ checklistItemPublicId: item.publicId });
  };

  return (
    <div className="group relative flex items-start gap-3 rounded-md py-2 pl-4 hover:bg-light-100 dark:hover:bg-dark-100">
      <label
        className={`relative mt-[2px] inline-flex h-[16px] w-[16px] flex-shrink-0 items-center justify-center`}
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
            "h-[16px] w-[16px] appearance-none rounded-md border border-light-500 bg-transparent outline-none ring-0 checked:bg-blue-600 focus:shadow-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none dark:border-dark-500 dark:hover:border-dark-500",
            viewOnly ? "cursor-default" : "cursor-pointer",
          )}
        />
      </label>
      <div className="flex-1 pr-7">
        <ContentEditable
          html={title}
          disabled={viewOnly}
          onChange={(e) => setTitle(e.target.value)}
          // @ts-expect-error - valid event
          onBlur={(e: Event) => commitTitle(e.target.innerHTML as string)}
          className={twMerge(
            "m-0 min-h-[20px] w-full p-0 text-sm leading-[20px] text-light-950 outline-none focus-visible:outline-none dark:text-dark-950",
            viewOnly && "cursor-default",
          )}
          placeholder={t`Add details...`}
          onKeyDown={(e) => {
            if (viewOnly) return;
            if (e.key === "Enter") {
              e.preventDefault();
              commitTitle(title);
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setTitle(item.title);
            }
          }}
        />
      </div>
      {!viewOnly && (
        <button
          type="button"
          onClick={handleDelete}
          className="absolute right-1 top-1/2 hidden -translate-y-1/2 rounded-md p-1 text-light-900 group-hover:block hover:bg-light-200 dark:text-dark-700 dark:hover:bg-dark-200"
        >
          <HiXMark size={16} />
        </button>
      )}
    </div>
  );
}
