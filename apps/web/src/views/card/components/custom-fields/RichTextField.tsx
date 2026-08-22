import { useState } from "react";
import type { WorkspaceMember } from "~/components/Editor";
import Editor from "~/components/Editor";
import type { CustomFieldDef } from "@kan/shared";

interface Props {
  fieldKey: string;
  field: CustomFieldDef;
  value: unknown;
  onChange: (value: string) => void;
  workspaceMembers: WorkspaceMember[];
  canEdit?: boolean;
  embedded?: boolean;
  isSidebar?: boolean;
}

export function RichTextField({
  fieldKey,
  field,
  value,
  onChange,
  workspaceMembers,
  canEdit = true,
  embedded = false,
  isSidebar = false,
}: Props) {
  const [isFocused, setIsFocused] = useState(embedded);
  const stringValue = value != null ? String(value) : "";
  const isCollapsed = !stringValue && !isFocused && !embedded;

  return (
    <div
      className={`kan-custom-field kan-field-${fieldKey} prose-sm ${
        isCollapsed ? "min-h-[38px]" : "min-h-[80px]"
      } w-full rounded border transition-all duration-200 ${
        isSidebar
          ? "border-transparent hover:border-light-200 dark:hover:border-dark-700"
          : "border-light-400 dark:border-dark-700"
      } p-2 ${embedded ? "bg-light-50 dark:bg-dark-100" : ""}`}
      data-field-key={fieldKey}
      onFocusCapture={() => setIsFocused(true)}
      onBlurCapture={() => !embedded && setIsFocused(false)}
    >
      <Editor
        content={stringValue}
        onChange={onChange}
        readOnly={!canEdit}
        workspaceMembers={workspaceMembers}
        placeholder={field.placeholder}
        disableHeadings
      />
    </div>
  );
}
