import { useEffect, useState } from "react";

import type { CustomFieldDef } from "@kan/shared";

interface Props {
  fieldKey: string;
  field: CustomFieldDef;
  value: unknown;
  onChange: (value: string | number | null) => void;
  canEdit?: boolean;
  embedded?: boolean;
}

export function TextField({
  fieldKey,
  field,
  value,
  onChange,
  canEdit = true,
  embedded = false,
}: Props) {
  const externalValue = value != null ? String(value) : "";
  const [draft, setDraft] = useState(externalValue);
  const [isFocused, setIsFocused] = useState(embedded);

  // Keep draft in sync if external value changes (e.g. server refresh)
  useEffect(() => {
    setDraft(externalValue);
  }, [externalValue]);

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

  const baseClass =
    "w-full rounded bg-light-50 px-2 py-1.5 text-sm text-neutral-900 border border-light-400 focus:border-neutral-400 focus:outline-none " +
    "dark:bg-dark-100 dark:text-dark-1000 dark:border-dark-700 dark:focus:border-dark-600";

  const staticClass =
    "w-full rounded bg-transparent px-2 py-1 text-sm text-neutral-900 dark:text-dark-1000 " +
    "border border-transparent hover:border-light-400 dark:hover:border-dark-400 " +
    "focus:border-neutral-400 dark:focus:border-dark-600 focus:outline-none " +
    "-mx-2 w-[calc(100%+1rem)]";

  if (field.type === "textarea") {
    const isCollapsed = !isFocused && !draft && !embedded;
    return (
      <div
        className={`kan-custom-field kan-field-${fieldKey}`}
        data-field-key={fieldKey}
      >
        <textarea
          className={`${embedded ? baseClass : staticClass} resize-y transition-[rows] duration-200`}
          rows={isCollapsed ? 1 : 3}
          value={draft}
          readOnly={!canEdit}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={canEdit ? handleBlur : () => setIsFocused(false)}
          placeholder={isCollapsed ? "" : undefined}
        />
      </div>
    );
  }

  const inputType =
    field.type === "number" ? "number" : field.type === "tel" ? "tel" : "text";

  return (
    <div
      className={`kan-custom-field kan-field-${fieldKey}`}
      data-field-key={fieldKey}
    >
      <input
        type={inputType}
        className={embedded ? baseClass : staticClass}
        value={draft}
        readOnly={!canEdit}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={canEdit ? handleBlur : () => setIsFocused(false)}
      />
    </div>
  );
}
