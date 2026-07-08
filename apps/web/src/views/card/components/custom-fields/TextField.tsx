import { useEffect, useRef, useState } from "react";

import type { CustomFieldDef } from "@kan/shared";
import { api } from "~/utils/api";

interface Props {
  fieldKey: string;
  field: CustomFieldDef;
  value: unknown;
  onChange: (value: string | number | null) => void;
  canEdit?: boolean;
  embedded?: boolean;
  boardPublicId: string;
  sectionKey?: string;
  isSidebar?: boolean;
}

export function TextField({
  fieldKey,
  field,
  value,
  onChange,
  canEdit = true,
  embedded = false,
  boardPublicId,
  sectionKey,
  isSidebar = false,
}: Props) {
  const externalValue = value != null ? String(value) : "";
  const [draft, setDraft] = useState(externalValue);
  const [isFocused, setIsFocused] = useState(embedded);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: suggestions } = api.card.getCustomFieldValues.useQuery(
    {
      boardPublicId,
      fieldKey,
      sectionKey,
      limit: field.autofillLimit ?? 10,
    },
    {
      enabled: Boolean(field.autofillFromCards && isFocused && canEdit),
    },
  );

  // Keep draft in sync if external value changes (e.g. server refresh)
  useEffect(() => {
    setDraft(externalValue);
  }, [externalValue]);

  // Handle auto-resize for textarea
  useEffect(() => {
    if (field.type === "textarea" && textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const newHeight = textareaRef.current.scrollHeight;
      const minHeight = isFocused || embedded ? 80 : 0;
      textareaRef.current.style.height = `${Math.max(newHeight, minHeight)}px`;
    }
  }, [draft, field.type, isFocused, embedded]);

  const handleBlur = () => {
    if (!embedded) {
      setIsFocused(false);
    }
    if (field.type === "number") {
      onChange(draft === "" ? null : Number(draft));
    } else {
      onChange(draft === "" ? null : draft);
    }
  };

  const handleSuggestionClick = (val: string) => {
    setDraft(val);
    if (field.type === "number") {
      onChange(val === "" ? null : Number(val));
    } else {
      onChange(val === "" ? null : val);
    }
    setIsFocused(false);
  };

  const baseClass =
    "w-full rounded bg-light-50 px-2 py-1.5 text-sm text-neutral-900 border border-light-400 focus:border-neutral-400 focus:outline-none " +
    "dark:bg-dark-100 dark:text-dark-1000 dark:border-dark-700 dark:focus:border-dark-600";

  const staticClass = `w-full rounded bg-transparent ${
    isSidebar ? "py-1 pl-2 text-xs border-light-50 dark:border-dark-50" : "px-2 py-1 text-sm border-transparent"
  } text-neutral-900 dark:text-dark-1000 border hover:border-light-400 dark:hover:border-dark-400 focus:border-neutral-400 dark:focus:border-dark-600 focus:outline-none ${
    isSidebar ? "" : "-mx-2 w-[calc(100%+1rem)]"
  }`;

  const filteredSuggestions = (
    (suggestions as string[] | undefined) ?? []
  ).filter((val: string) => val.toLowerCase().includes(draft.toLowerCase()) && val !== draft);

  return (
    <div className="relative w-full">
      {field.description && (
        <p className="mb-1 text-[11px] text-neutral-500 dark:text-dark-700">
          {field.description}
        </p>
      )}
      {field.type === "textarea" ? (
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          readOnly={!canEdit}
          placeholder={field.placeholder}
          rows={1}
          className={`${
            embedded ? baseClass : staticClass
          } resize-none overflow-hidden`}
        />
      ) : (
        <input
          type={field.type === "number" ? "number" : "text"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          readOnly={!canEdit}
          placeholder={field.placeholder}
          className={embedded ? baseClass : staticClass}
        />
      )}

      {isFocused && filteredSuggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-40 overflow-y-auto rounded border border-light-300 bg-white shadow-lg dark:border-dark-600 dark:bg-dark-200">
          {filteredSuggestions.map((val: string) => (
            <div
              key={val}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSuggestionClick(val);
              }}
              className="cursor-pointer px-2 py-1.5 text-sm hover:bg-light-100 dark:hover:bg-dark-300"
            >
              {val}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
