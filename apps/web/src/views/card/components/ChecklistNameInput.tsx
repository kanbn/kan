import { t } from "@lingui/core/macro";
import { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";
import { invalidateCard } from "~/utils/cardInvalidation";

export default function ChecklistNameInput({
  checklistPublicId,
  initialName,
  cardPublicId,
  viewOnly = false,
}: {
  checklistPublicId: string;
  initialName: string;
  cardPublicId: string;
  viewOnly?: boolean;
}) {
  const utils = api.useUtils();
  const { showPopup } = usePopup();
  const [name, setName] = useState(initialName);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setName(initialName);
  }, [initialName, checklistPublicId]);

  const update = api.checklist.update.useMutation({
    onMutate: async (vars) => {
      await utils.card.byId.cancel({ cardPublicId });
      const previous = utils.card.byId.getData({ cardPublicId });
      utils.card.byId.setData({ cardPublicId }, (old) => {
        if (!old) return old as any;
        const updated = old.checklists.map((cl) =>
          cl.publicId === checklistPublicId ? { ...cl, name: vars.name } : cl,
        );
        return { ...old, checklists: updated } as typeof old;
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous)
        utils.card.byId.setData({ cardPublicId }, ctx.previous);
      showPopup({
        header: t`Unable to update checklist`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      await invalidateCard(utils, cardPublicId);
    },
  });

  const commit = () => {
    if (viewOnly) return;
    const trimmed = name.trim();
    if (!trimmed || trimmed === initialName) return;
    update.mutate({ checklistPublicId, name: trimmed });
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={name}
      readOnly={viewOnly}
      onChange={(e) => setName(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (viewOnly) return;
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
          inputRef.current?.blur();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setName(initialName);
          inputRef.current?.blur();
        }
      }}
      title={name}
      className={twMerge(
        "text-md block w-full truncate border-0 bg-transparent p-0 py-0 font-medium text-light-1000 outline-none focus:ring-0 dark:text-dark-1000",
        viewOnly && "cursor-default",
      )}
    />
  );
}
