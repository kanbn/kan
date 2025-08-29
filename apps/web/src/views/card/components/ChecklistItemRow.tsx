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
  viewOnly = false,
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
    if (viewOnly) return;
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

return (
  <div
    className={twMerge(
      "group relative flex items-center gap-3 rounded-md px-3 py-2",
      "hover:bg-light-100 dark:hover:bg-dark-100"
    )}
  >
    {/* Completed Checkbox */}
    <input
      type="checkbox"
      checked={completed}
      onChange={handleToggleCompleted}
      disabled={viewOnly}
      className={twMerge(
        "h-4 w-4 rounded-md border bg-transparent",
        "border-light-500 dark:border-dark-500",
        viewOnly ? "cursor-default" : "cursor-pointer"
      )}
    />

    {/* Title */}
    <div className="flex-1 pr-7">
      <ContentEditable
        html={title}
        disabled={viewOnly}
        onChange={(e) => setTitle(e.target.value)}
        // @ts-expect-error - valid event
        onBlur={(e: Event) => commitTitle(e.target.innerHTML as string)}
        className={twMerge(
          "m-0 min-h-[20px] w-full p-0 text-sm leading-[20px] outline-none",
          "text-light-950 dark:text-dark-50",
          viewOnly && "cursor-default"
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

    {/* Iron */}
    <label className="flex items-center gap-1 text-xs text-light-900 dark:text-dark-200">
      <input
        type="checkbox"
        checked={iron}
        disabled={viewOnly}
        onChange={handleToggleIron}
        className={twMerge(
          "h-4 w-4 rounded-md border bg-transparent",
          "border-light-500 dark:border-dark-500",
          viewOnly ? "cursor-default" : "cursor-pointer"
        )}
      />
      Iron
    </label>

    {/* Wash */}
    <label className="flex items-center gap-1 text-xs text-light-900 dark:text-dark-200">
      <input
        type="checkbox"
        checked={wash}
        disabled={viewOnly}
        onChange={handleToggleWash}
        className={twMerge(
          "h-4 w-4 rounded-md border bg-transparent",
          "border-light-500 dark:border-dark-500",
          viewOnly ? "cursor-default" : "cursor-pointer"
        )}
      />
      Wash
    </label>

    {/* Item Value */}
    <input
      type="number"
      value={itemValue}
      disabled={viewOnly}
      onChange={(e) => {
        const val = Number(e.target.value);
        setItemValue(val);
        updateItem.mutate({
          checklistItemPublicId: item.publicId,
          itemValue: val,
        });
      }}
      className={twMerge(
        "w-20 rounded-md border px-2 py-1 text-sm",
        "border-light-300 bg-white text-light-950",
        "dark:border-dark-400 dark:bg-dark-800 dark:text-dark-50",
        viewOnly ? "cursor-default" : "cursor-text"
      )}
    />

    {/* Quantity */}
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
        "w-16 rounded-md border px-2 py-1 text-sm",
        "border-light-300 bg-white text-light-950",
        "dark:border-dark-400 dark:bg-dark-800 dark:text-dark-50",
        viewOnly ? "cursor-default" : "cursor-text"
      )}
    />

    {/* Delete button */}
    {!viewOnly && (
      <button
        type="button"
        onClick={handleDelete}
        className={twMerge(
          "absolute right-2 rounded-md p-1",
          "text-light-700 hover:bg-light-200 hover:text-light-900",
          "dark:text-dark-400 dark:hover:bg-dark-600 dark:hover:text-dark-50",
          "hidden group-hover:block"
        )}
      >
        <HiXMark size={16} />
      </button>
    )}
  </div>
);

}
