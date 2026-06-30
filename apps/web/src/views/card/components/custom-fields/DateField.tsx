import { t } from "@lingui/core/macro";
import { format, parseISO, isValid, parse } from "date-fns";
import { useState, useRef, useEffect } from "react";
import { HiMiniPlus, HiXMark } from "react-icons/hi2";

import DateSelector from "~/components/DateSelector";
import { useWorkspace } from "~/providers/workspace";
import type { CustomFieldDef } from "@kan/shared";

interface Props {
  fieldKey: string;
  field: CustomFieldDef;
  value: unknown;
  onChange: (value: string | null) => void;
  canEdit?: boolean;
  embedded?: boolean;
}

export function DateField({
  fieldKey,
  field,
  value,
  onChange,
  canEdit = true,
  embedded = false,
}: Props) {
  const { workspace } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(embedded);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const externalValue = value != null ? String(value) : "";
  const dateObj = externalValue ? parseISO(externalValue) : null;
  const isDateTime = field.type === "datetime-local";

  const [typeValue, setTypeValue] = useState("");

  useEffect(() => {
    if (!isTyping) {
      setTypeValue(
        dateObj && isValid(dateObj)
          ? format(dateObj, isDateTime ? "MM/dd/yyyy HH:mm" : "MM/dd/yyyy")
          : ""
      );
    }
  }, [externalValue, isDateTime, isTyping, dateObj]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!canEdit) return;
    if (!date) {
      onChange(null);
    } else {
      const val = isDateTime ? date.toISOString() : format(date, "yyyy-MM-dd");
      onChange(val);
    }
    setIsOpen(false);
    setIsTyping(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setIsOpen(false);
    setIsTyping(false);
  };

  const handleManualInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTypeValue(e.target.value);
  };

  const handleInputBlur = () => {
    if (!embedded) {
      setIsTyping(false);
    }
    
    if (!typeValue) {
      onChange(null);
      return;
    }

    // Try to parse common formats
    const formats = isDateTime 
      ? ["MM/dd/yyyy HH:mm", "MM/dd/yyyy H:mm", "yyyy-MM-dd'T'HH:mm"] 
      : ["MM/dd/yyyy", "M/d/yyyy", "MM-dd-yyyy", "yyyy-MM-dd"];
    
    let parsed: Date | null = null;
    for (const fmt of formats) {
      const d = parse(typeValue, fmt, new Date());
      if (isValid(d)) {
        parsed = d;
        break;
      }
    }

    if (parsed) {
      const val = isDateTime ? parsed.toISOString() : format(parsed, "yyyy-MM-dd");
      onChange(val);
    } else {
      // Revert if invalid
      setTypeValue(dateObj && isValid(dateObj) ? format(dateObj, isDateTime ? "MM/dd/yyyy HH:mm" : "MM/dd/yyyy") : "");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      inputRef.current?.blur();
    } else if (e.key === "Escape") {
      setIsTyping(false);
      setIsOpen(false);
    }
  };

  const displayString = dateObj && isValid(dateObj)
    ? format(dateObj, isDateTime ? "MMM d, yyyy HH:mm" : "MMM d, yyyy")
    : null;

  return (
    <div
      className={`kan-custom-field kan-field-${fieldKey} relative flex w-full items-center text-left ${embedded ? "border border-light-400 dark:border-dark-700 bg-light-50 dark:bg-dark-100 rounded" : ""}`}
      data-field-key={fieldKey}
    >
      <div className="group relative flex w-full items-center">
        {isTyping ? (
          <input
            ref={inputRef}
            autoFocus={!embedded}
            type="text"
            className={`w-full rounded bg-transparent px-2 py-1.5 text-sm text-neutral-900 focus:outline-none dark:text-dark-1000 ${embedded ? "" : "-mx-2 w-[calc(100%+1rem)]"}`}
            value={typeValue}
            onChange={handleManualInput}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            placeholder={isDateTime ? "MM/dd/yyyy HH:mm" : "MM/dd/yyyy"}
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              if (canEdit) {
                setIsOpen(!isOpen);
                setIsTyping(true);
              }
            }}
            disabled={!canEdit}
            className={`flex w-full items-center rounded px-2 py-1.5 text-sm transition-colors ${
              displayString 
                ? "text-neutral-900 dark:text-dark-1000" 
                : "text-neutral-400 dark:text-dark-600 italic"
            } ${
              canEdit 
                ? `${embedded ? "" : "-mx-2 w-[calc(100%+1rem)] hover:bg-light-100 dark:hover:bg-dark-100"}`
                : "cursor-default"
            }`}
          >
            {displayString ? (
              <span>{displayString}</span>
            ) : (
              <span className="flex items-center gap-1">
                <HiMiniPlus className="h-4 w-4" />
                {t`Set date`}
              </span>
            )}
          </button>
        )}

        {displayString && canEdit && !isTyping && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-0 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-400 opacity-0 hover:bg-light-200 group-hover:opacity-100 dark:text-dark-700 dark:hover:bg-dark-200"
            aria-label={t`Clear date`}
          >
            <HiXMark className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {isOpen && canEdit && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div
            className="absolute left-0 top-full z-20 mt-1 rounded-md border border-light-200 bg-light-50 shadow-lg dark:border-dark-200 dark:bg-dark-100"
            onClick={(e) => e.stopPropagation()}
          >
            <DateSelector
              selectedDate={dateObj && isValid(dateObj) ? dateObj : undefined}
              onDateSelect={handleDateSelect}
              weekStartsOn={workspace.weekStartDay}
            />
          </div>
        </>
      )}
    </div>
  );
}
