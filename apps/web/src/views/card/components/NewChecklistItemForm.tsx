import { t } from "@lingui/core/macro";
import { useEffect, useRef } from "react";
import ContentEditable from "react-contenteditable";
import { useForm } from "react-hook-form";

import { useCreateChecklistItem } from "@kan/api-client/hooks";
import { generateUID } from "@kan/shared/utils";

import { usePopup } from "~/providers/popup";
import { useCardCache } from "~/utils/cardCache";

interface FormValues {
  title: string;
}

interface NewChecklistItemFormProps {
  checklistPublicId: string;
  cardPublicId: string;
  onCancel: () => void;
  readOnly?: boolean;
}

const NewChecklistItemForm = ({
  checklistPublicId,
  cardPublicId,
  onCancel,
  readOnly = false,
}: NewChecklistItemFormProps) => {
  const cardCache = useCardCache();
  const { showPopup } = usePopup();

  const { setValue, watch, reset, getValues } = useForm<FormValues>({
    defaultValues: {
      title: "",
    },
  });

  const title = watch("title");

  const editableRef = useRef<HTMLElement | null>(null);
  const keepOpenRef = useRef(false);

  const refocusEditable = () => {
    const el = editableRef.current;
    if (!el) return;
    if (readOnly) return;
    el.focus();

    // hack to ensure the input is focused after creating new checklist item
    setTimeout(() => {
      el.focus();
    }, 100);
  };

  const addChecklistItemMutation = useCreateChecklistItem({
    mutation: {
      onMutate: async (vars) => {
        await cardCache.byId.cancel({ cardPublicId });
        const previous = cardCache.byId.getData({ cardPublicId });
        const optimisticPublicId = `PLACEHOLDER_${generateUID()}`;

        cardCache.byId.setData({ cardPublicId }, (old) => {
          if (!old) return old;
          const placeholder = {
            publicId: optimisticPublicId,
            clientId: optimisticPublicId,
            title: vars.data.title,
            completed: false,
          };
          const updatedChecklists = old.checklists.map((cl) =>
            cl.publicId === checklistPublicId
              ? { ...cl, items: [...cl.items, placeholder] }
              : cl,
          );
          return { ...old, checklists: updatedChecklists } as typeof old;
        });

        if (keepOpenRef.current) {
          reset({ title: "" });
          if (editableRef.current) editableRef.current.innerHTML = "";
          refocusEditable();
        } else {
          onCancel();
        }

        return { previous, optimisticPublicId };
      },
      onSuccess: (result, _vars, context) => {
        cardCache.byId.setData({ cardPublicId }, (old) => {
          if (!old) return old;
          const updatedChecklists = old.checklists.map((cl) => ({
            ...cl,
            items: cl.items.map((item) =>
              item.publicId === context.optimisticPublicId
                ? { ...item, publicId: result.data.publicId }
                : item,
            ),
          }));
          return { ...old, checklists: updatedChecklists };
        });
      },
      onError: (_err, _vars, ctx) => {
        if (ctx?.previous)
          cardCache.byId.setData({ cardPublicId }, ctx.previous);
        showPopup({
          header: t`Unable to add checklist item`,
          message: t`Please try again later, or contact customer support.`,
          icon: "error",
        });
      },
      onSettled: async () => {
        await cardCache.getActivities.invalidate({ cardPublicId });
      },
    },
  });

  const sanitizeHtmlToPlainText = (html: string): string => {
    return html
      .replace(/<br\s*\/?>(\n)?/gi, "\n")
      .replace(/<div><br\s*\/?><\/div>/gi, "")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim();
  };

  const submitIfNotEmpty = (keepOpen: boolean) => {
    if (readOnly) return;
    keepOpenRef.current = keepOpen;
    const currentHtml = getValues("title");
    const plain = sanitizeHtmlToPlainText(currentHtml);
    if (!plain) {
      onCancel();
      return;
    }
    addChecklistItemMutation.mutate({
      checklistPublicId,
      data: { title: plain },
    });
  };

  useEffect(() => {
    refocusEditable();
  }, []);

  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <div className="group relative flex h-9 items-center gap-3 rounded-md pl-4 hover:bg-light-100 dark:hover:bg-dark-100">
        <label className="relative inline-flex h-[16px] w-[16px] shrink-0 cursor-default items-center justify-center">
          <input
            type="checkbox"
            disabled
            className="peer h-[16px] w-[16px] appearance-none rounded-md border border-light-500 bg-transparent outline-hidden ring-0 hover:border-light-500 hover:bg-transparent focus:outline-hidden focus:ring-0 focus-visible:outline-hidden dark:border-dark-500 dark:hover:border-dark-500"
          />
        </label>
        <div className="flex-1 pr-7">
          <ContentEditable
            id={`checklist-item-input-${checklistPublicId}`}
            tabIndex={readOnly ? -1 : 0}
            placeholder={t`Add an item...`}
            html={title}
            disabled={readOnly}
            onChange={(e) => setValue("title", e.target.value)}
            className="m-0 min-h-[20px] w-full p-0 text-sm leading-5 text-light-900 outline-hidden focus-visible:outline-hidden dark:text-dark-950"
            onBlur={() => submitIfNotEmpty(false)}
            onKeyDown={(e) => {
              if (readOnly) return;
              if (e.key === "Enter") {
                e.preventDefault();
                submitIfNotEmpty(true);
              }
              if (e.key === "Escape") {
                e.preventDefault();
                onCancel();
              }
            }}
            // Must be a stable ref: react-contenteditable re-renders when
            // `innerRef` changes identity, and that re-render resets the caret,
            // which cancels dead-key / IME composition on every keystroke.
            innerRef={editableRef}
          />
        </div>
      </div>
    </form>
  );
};

export default NewChecklistItemForm;
