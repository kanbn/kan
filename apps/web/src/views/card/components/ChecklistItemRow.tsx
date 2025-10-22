import { t } from "@lingui/core/macro";
import { useEffect, useState } from "react";
import ContentEditable from "react-contenteditable";
import { HiXMark } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

interface ChecklistItemRowProps {
  item: {
    publicId: string;
    title: string;
    itemValue: number;
    itemIdentity: string;
    quantity: number;
    wash: boolean;
    iron: boolean;
    completed: boolean;
  };
  cardPublicId: string;
  viewOnly?: boolean;
}

export default function ChecklistItemRow({
  item,
  cardPublicId,
  viewOnly,
}: ChecklistItemRowProps) {
  const utils = api.useUtils();
  const { showPopup } = usePopup();

  const [title, setTitle] = useState("");
  const [completed, setCompleted] = useState(false);
  const [iron, setIron] = useState(item.iron);
  const [wash, setWash] = useState(item.wash);
  const [itemValue, setItemValue] = useState(item.itemValue);
  const [quantity, setQuantity] = useState(item.quantity);

  const updateItem = api.checklist.updateItem.useMutation({
    onMutate: async (vars) => {
      await utils.card.byId.cancel({ cardPublicId });
      const previous = utils.card.byId.getData({ cardPublicId });
      utils.card.byId.setData({ cardPublicId }, (old) => {
        if (!old) return old as any;
        const updatedChecklists = old.checklists.map((cl) => ({
          ...cl,
          items: cl.items.map((ci) =>
            ci.publicId === item.publicId ? { ...ci, ...vars } : ci,
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
      await utils.card.byId.invalidate({ cardPublicId });
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
      await utils.card.byId.invalidate({ cardPublicId });
    },
  });

  useEffect(() => {
    setTitle(item.title);
    setCompleted(item.completed);
    setIron(item.iron);
    setWash(item.wash);
    setItemValue(item.itemValue);
    setQuantity(item.quantity);
  }, [item.publicId]);

  const sanitizeHtmlToPlainText = (html: string): string =>
    html
      .replace(/<br\s*\/?>(\n)?/gi, "\n")
      .replace(/<div><br\s*\/?><\/div>/gi, "")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim();

  const handleToggleCompleted = () => {
    //if (viewOnly) return;
    setCompleted((prev) => !prev);
    updateItem.mutate({
      checklistItemPublicId: item.publicId,
      completed: !completed,
    });
  };
  const handleToggleIron = () => {
    if (viewOnly) return;
    setIron((prev) => !prev);
    updateItem.mutate({
      checklistItemPublicId: item.publicId,
      iron: !iron,
    });
  };
  const handleToggleWash = () => {
    if (viewOnly) return;
    setWash((prev) => !prev);
    updateItem.mutate({
      checklistItemPublicId: item.publicId,
      wash: !wash,
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

  // ...existing code...
  return (
    <div
      className={twMerge(
        "group relative mb-2 flex flex-col rounded-md border border-light-300 bg-white px-3 py-2 dark:border-dark-300 dark:bg-dark-900",
        "sm:flex-row sm:items-center sm:gap-4",
        "gap-3",
      )}
    >
      {/* Completed Checkbox */}
      <label className="flex items-center gap-2 border-b border-light-200 pb-2 text-xs font-medium text-neutral-900 dark:border-dark-700 dark:text-gray-200 sm:border-none sm:pb-0">
        <input
          type="checkbox"
          checked={completed}
          onChange={handleToggleCompleted}
          disabled={false}
          className={twMerge(
            "h-4 w-4 rounded-md border bg-transparent",
            "border-light-500 dark:border-dark-500",
            "cursor-pointer",
          )}
        />
        <span>Concluído</span>
      </label>

      {/* Title */}
      <div className="flex flex-row items-center justify-center border-b border-light-200 pb-2 dark:border-dark-700 sm:border-none sm:pb-0">
        <div className="flex flex-col">
          <ContentEditable
            html={title}
            disabled={viewOnly}
            onChange={(e) => setTitle(e.target.value)}
            // @ts-expect-error - valid event
            onBlur={(e: Event) => commitTitle(e.target.innerHTML as string)}
            className={twMerge(
              "text-md m-0 w-full p-0 leading-[20px] outline-none md:text-sm",
              "text-neutral-950",
              "dark:text-gray-100 dark:hover:text-white",
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
      </div>

      {/* Controls row */}
      <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-4">
        {/* Iron */}
        <label className="flex items-center gap-1 border-b border-light-200 pb-2 text-xs text-neutral-900 dark:border-dark-700 dark:text-gray-200 sm:border-none sm:pb-0">
          <input
            type="checkbox"
            checked={iron}
            disabled={viewOnly}
            onChange={handleToggleIron}
            className={twMerge(
              "h-4 w-4 rounded-md border bg-transparent",
              "border-light-500 dark:border-dark-500",
              viewOnly ? "cursor-default" : "cursor-pointer",
            )}
          />
          Ferro
        </label>

        {/* Wash */}
        <label className="flex items-center gap-1 border-b border-light-200 pb-2 text-xs text-neutral-900 dark:border-dark-700 dark:text-gray-200 sm:border-none sm:pb-0">
          <input
            type="checkbox"
            checked={wash}
            disabled={viewOnly}
            onChange={handleToggleWash}
            className={twMerge(
              "h-4 w-4 rounded-md border bg-transparent",
              "border-light-500 dark:border-dark-500",
              viewOnly ? "cursor-default" : "cursor-pointer",
            )}
          />
          Lavagem
        </label>

        {/* Quantity */}
        <label className="flex items-center gap-1 border-b border-light-200 pb-2 text-xs text-neutral-900 dark:border-dark-700 dark:text-gray-200 sm:border-none sm:pb-0">
          Qnt.
          <input
            type="number"
            value={quantity}
            disabled={viewOnly}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10) || 0;
              setQuantity(val);
              updateItem.mutate({
                checklistItemPublicId: item.publicId,
                quantity: val,
              });
            }}
            className={twMerge(
              "h-8 w-16 rounded-md border px-2 py-1 text-sm",
              "border-light-300 bg-white text-neutral-950",
              "dark:bg-gray-700 dark:text-gray-100 dark:hover:text-white",
              viewOnly ? "cursor-default" : "cursor-text",
            )}
          />
        </label>

        {/* Item Value */}
        <label className="flex items-center gap-1 border-b border-light-200 pb-2 text-xs text-neutral-900 dark:border-dark-700 dark:text-gray-200 sm:border-none sm:pb-0">
          R$
          <span
            className={twMerge(
              "flex h-8 w-16 items-center rounded-md px-2 py-1 text-sm",
              "bg-white text-neutral-950",
              "dark:bg-gray-700 dark:text-gray-100 dark:hover:text-white",
            )}
          >
            {itemValue}
          </span>
        </label>

        {/* Total */}
        <label className="flex items-center gap-1 border-b border-light-200 pb-2 text-xs text-neutral-900 dark:border-dark-700 dark:text-gray-200 sm:border-none sm:pb-0">
          Total
          <span
            className={twMerge(
              "flex h-8 w-16 items-center rounded-md px-2 py-1 text-sm",
              "bg-white text-neutral-950",
              "dark:bg-gray-700 dark:text-gray-100 dark:hover:text-white",
            )}
          >
            {(itemValue * quantity).toFixed(2)}
          </span>
        </label>
      </div>

      {/* Delete button */}
      {!viewOnly && (
        <button
          type="button"
          onClick={handleDelete}
          className={twMerge(
            "absolute right-2 top-2 rounded-md p-1 sm:static sm:ml-auto",
            "text-neutral-700 hover:bg-light-200 hover:text-neutral-900",
            "dark:border-dark-400 dark:bg-dark-800 dark:text-dark-50",
          )}
        >
          <HiXMark size={16} />
        </button>
      )}
    </div>
  );
}
