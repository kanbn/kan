import { useEffect, useState } from "react";
import { HiCheck, HiPencil, HiXMark } from "react-icons/hi2";
import { t } from "@lingui/core/macro";

import type { CustomFieldDef } from "@kan/shared";
import { api } from "~/utils/api";

interface Props {
  fieldKey: string;
  field: CustomFieldDef;
  value: unknown;
  onChange: (value: string | string[] | null) => void;
  canEdit?: boolean;
  embedded?: boolean;
  boardPublicId?: string;
  sectionKey?: string;
  isSidebar?: boolean;
}

export function SelectField({
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
  const options = field.options ?? {};
  const isMultiple = field.multiple ?? false;
  const placeholder = field.placeholder ?? (isMultiple ? t`Select options...` : t`Select option...`);
  const style = field.style ?? "dropdown";
  const alwaysExpanded = field.alwaysExpanded ?? false;

  const isCheckboxOrRadio = style === "checkbox" || style === "radio";

  const { data: suggestions } = api.card.getCustomFieldValues.useQuery(
    {
      boardPublicId: boardPublicId ?? "",
      fieldKey,
      sectionKey,
      limit: field.autofillLimit ?? 20,
    },
    {
      enabled: Boolean(
        field.autofillFromCards && boardPublicId && style === "autofill",
      ),
    },
  );

  // Apply default when value is null/undefined/empty
  const effectiveValue = (() => {
    const hasValue = value != null && value !== "" && !(Array.isArray(value) && value.length === 0);
    if (!hasValue && field.default != null) return field.default;
    return value;
  })();

  // Normalize to string[]
  const selectedValues: string[] = Array.isArray(effectiveValue)
    ? (effectiveValue as string[])
    : effectiveValue != null && effectiveValue !== ""
      ? [String(effectiveValue)]
      : [];

  // ── "Other" free-text option (checkbox/radio only) ──────────────────────────
  // Any selected value that isn't an option key is the user's own entry.
  const optionKeys = Object.keys(options);
  const otherLabel =
    isCheckboxOrRadio && field.allowOther
      ? typeof field.allowOther === "string"
        ? field.allowOther
        : t`Other`
      : null;
  const customValueOf = (values: string[]) =>
    values.find((v) => !optionKeys.includes(v)) ?? "";
  const withOther = (values: string[], text: string) => {
    const known = isMultiple ? values.filter((v) => optionKeys.includes(v)) : [];
    const trimmed = text.trim();
    return trimmed ? [...known, trimmed] : known;
  };
  const toFieldValue = (values: string[]) =>
    isMultiple ? values : values[0] ?? null;

  const savedCustomValue = customValueOf(selectedValues);
  // otherActive tracks a checked "Other" box whose text is still empty
  const [otherActive, setOtherActive] = useState(savedCustomValue !== "");
  const [otherText, setOtherText] = useState(savedCustomValue);

  useEffect(() => {
    if (savedCustomValue) {
      setOtherText(savedCustomValue);
      setOtherActive(true);
    }
  }, [savedCustomValue]);

  const resetOther = () => {
    setOtherActive(savedCustomValue !== "");
    setOtherText(savedCustomValue);
  };

  const [isEditing, setIsEditing] = useState(false);
  // local draft while editing
  const [draft, setDraft] = useState<string[]>(selectedValues);

  const startEditing = () => {
    if (!canEdit) return;
    setDraft(selectedValues);
    resetOther();
    setIsEditing(true);
  };

  const commitEdit = () => {
    onChange(toFieldValue(draft));
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setDraft(selectedValues);
    resetOther();
    setIsEditing(false);
  };

  const handleDraftCheckboxChange = (optionKey: string, checked: boolean) => {
    if (isMultiple) {
      setDraft(checked ? [...draft, optionKey] : draft.filter((v) => v !== optionKey));
    } else {
      setDraft(checked ? [optionKey] : []);
      if (checked) {
        setOtherActive(false);
        setOtherText("");
      }
    }
  };

  const handleDraftOtherToggle = (checked: boolean) => {
    setOtherActive(checked);
    setDraft(withOther(draft, checked ? otherText : ""));
  };

  const handleDraftOtherTextChange = (text: string) => {
    setOtherText(text);
    setDraft(withOther(draft, text));
  };

  const handleDraftSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (isMultiple) {
      setDraft(Array.from(e.target.selectedOptions).map((o) => o.value));
    } else {
      setDraft(e.target.value ? [e.target.value] : []);
    }
  };

  const handleDraftAutofillChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // If the typed value matches a label, store the key. Otherwise store the raw value.
    const matchingKey = Object.entries(options).find(([, label]) => label === val)?.[0];
    setDraft(val ? [matchingKey ?? val] : []);
  };

  const handleImmediateChange = (optionKey: string, checked: boolean) => {
    if (!canEdit) return;
    if (isMultiple) {
      const next = checked
        ? [...selectedValues, optionKey]
        : selectedValues.filter((v) => v !== optionKey);
      onChange(next);
    } else {
      onChange(checked ? optionKey : null);
      if (checked) {
        setOtherActive(false);
        setOtherText("");
      }
    }
  };

  const handleImmediateOtherToggle = (checked: boolean) => {
    if (!canEdit) return;
    setOtherActive(checked);
    onChange(toFieldValue(withOther(selectedValues, checked ? otherText : "")));
  };

  const handleImmediateOtherBlur = () => {
    if (!canEdit || otherText.trim() === savedCustomValue) return;
    onChange(toFieldValue(withOther(selectedValues, otherText)));
  };

  const renderOtherOption = ({
    checked,
    name,
    onToggle,
    onTextChange,
    onTextBlur,
  }: {
    checked: boolean;
    name: string;
    onToggle: (checked: boolean) => void;
    onTextChange: (text: string) => void;
    onTextBlur?: () => void;
  }) => (
    <div className="flex items-center gap-2 text-sm text-neutral-800 dark:text-dark-900">
      <label
        className={`flex shrink-0 items-center gap-2 ${!canEdit ? "cursor-default opacity-60" : "cursor-pointer"}`}
      >
        <input
          type={style === "radio" ? "radio" : "checkbox"}
          name={name}
          checked={checked}
          disabled={!canEdit}
          onChange={(e) => onToggle(e.target.checked)}
          className="rounded"
        />
        {otherLabel}
      </label>
      {checked && (
        <input
          type="text"
          value={otherText}
          onChange={(e) => onTextChange(e.target.value)}
          onBlur={onTextBlur}
          readOnly={!canEdit}
          placeholder={t`Please specify`}
          className="min-w-0 flex-1 rounded border border-light-400 bg-transparent px-2 py-0.5 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none dark:border-dark-400 dark:text-dark-1000 dark:focus:border-dark-600"
        />
      )}
    </div>
  );

  // Summary of selected values for read mode
  const selectedLabels = selectedValues
    .map((v) => options[v] ?? v)
    .filter(Boolean) as string[];
  const summaryText =
    selectedLabels.length > 0 ? (
      selectedLabels.join(", ")
    ) : (
      <span className="italic text-neutral-400 dark:text-dark-600">
        {placeholder}
      </span>
    );

  // ── Always-expanded or Embedded: inline checkboxes/radio ─────────────────────
  if (isCheckboxOrRadio && (alwaysExpanded || embedded)) {
    return (
      <div
        className={`kan-custom-field kan-field-${fieldKey} flex flex-col gap-1`}
        data-field-key={fieldKey}
      >
        {Object.entries(options).map(([key, label]) => (
          <label
            key={key}
            className={`flex items-center gap-2 text-sm text-neutral-800 dark:text-dark-900 ${!canEdit ? "cursor-default opacity-60" : "cursor-pointer"}`}
          >
            <input
              type={style === "radio" ? "radio" : "checkbox"}
              name={fieldKey}
              value={key}
              checked={selectedValues.includes(key)}
              disabled={!canEdit}
              onChange={(e) => handleImmediateChange(key, e.target.checked)}
              className="rounded"
            />
            {label}
          </label>
        ))}
        {otherLabel &&
          renderOtherOption({
            checked: otherActive || savedCustomValue !== "",
            name: fieldKey,
            onToggle: handleImmediateOtherToggle,
            onTextChange: setOtherText,
            onTextBlur: handleImmediateOtherBlur,
          })}
      </div>
    );
  }

  // ── Always-expanded or Embedded: autofill ─────────────────────────────────────
  if ((alwaysExpanded || embedded) && style === "autofill") {
    const handleImmediateAutofillChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!canEdit) return;
      const val = e.target.value;
      const matchingKey = Object.entries(options).find(([, label]) => label === val)?.[0];
      onChange(matchingKey ?? (val || null));
    };

    const autofillValue = Array.isArray(effectiveValue)
      ? effectiveValue[0] ?? ""
      : effectiveValue ?? "";

    const displayValue = options[autofillValue] ?? autofillValue;

    return (
      <div
        className={`kan-custom-field kan-field-${fieldKey}`}
        data-field-key={fieldKey}
      >
        <input
          type="text"
          list={`${fieldKey}-datalist`}
          value={displayValue}
          onChange={handleImmediateAutofillChange}
          disabled={!canEdit}
          placeholder={placeholder}
          className="w-full rounded border border-light-400 bg-light-50 px-2 py-1.5 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none disabled:opacity-60 dark:border-dark-700 dark:bg-dark-100 dark:text-dark-1000 dark:focus:border-dark-600"
        />
        <datalist id={`${fieldKey}-datalist`}>
          {Object.entries(options).map(([key, label]) => (
            <option key={key} value={label} />
          ))}
          {(suggestions as string[] ?? []).map((val: string) => (
            <option key={`suggestion-${val}`} value={val} />
          ))}
        </datalist>
      </div>
    );
  }

  // ── Embedded: Dropdown ────────────────────────────────────────────────────────
  if (embedded && style === "dropdown") {
    return (
      <div
        className={`kan-custom-field kan-field-${fieldKey}`}
        data-field-key={fieldKey}
      >
        <select
          className="w-full rounded border border-light-400 bg-light-50 px-2 py-1.5 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none dark:border-dark-700 dark:bg-dark-100 dark:text-dark-1000 dark:focus:border-dark-600"
          value={isMultiple ? selectedValues : selectedValues[0] ?? ""}
          multiple={isMultiple}
          onChange={(e) => {
            if (isMultiple) {
              onChange(Array.from(e.target.selectedOptions).map((o) => o.value));
            } else {
              onChange(e.target.value || null);
            }
          }}
          disabled={!canEdit}
        >
          {!isMultiple && <option value="">{placeholder}</option>}
          {Object.entries(options).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // ── Compact read/edit mode ──────────────────────────────────────────────────
  if (!isEditing) {
    return (
      <div
        className={`kan-custom-field kan-field-${fieldKey} group flex items-center justify-between gap-2 rounded cursor-pointer ${
          isSidebar 
            ? "py-1 pl-2 text-xs border border-light-50 dark:border-dark-50" 
            : "px-2 py-1 -mx-2 text-sm"
        } hover:bg-light-100 dark:hover:bg-dark-100`}
        data-field-key={fieldKey}
        onClick={startEditing}
      >
        <span className="text-sm text-neutral-900 dark:text-dark-1000">
          {summaryText}
        </span>
        {canEdit && (
          <button
            type="button"
            className="rounded p-1 text-neutral-400 opacity-0 group-hover:opacity-100 dark:text-dark-700"
            aria-label={t`Edit`}
          >
            <HiPencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  // ── Edit mode ───────────────────────────────────────────────────────────────
  return (
    <div
      className={`kan-custom-field kan-field-${fieldKey} flex flex-col gap-2`}
      data-field-key={fieldKey}
    >
      {style === "dropdown" ? (
        <select
          className="w-full rounded border border-light-400 bg-transparent px-2 py-1.5 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none dark:border-dark-400 dark:text-dark-1000 dark:focus:border-dark-600"
          multiple={isMultiple}
          value={isMultiple ? draft : draft[0] ?? ""}
          onChange={handleDraftSelectChange}
        >
          {!isMultiple && <option value="">{placeholder}</option>}
          {Object.entries(options).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      ) : style === "autofill" ? (
        <>
          <input
            type="text"
            list={`${fieldKey}-datalist`}
            value={options[draft[0] ?? ""] ?? draft[0] ?? ""}
            onChange={handleDraftAutofillChange}
            placeholder={placeholder}
            className="w-full rounded border border-light-400 bg-transparent px-2 py-1.5 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none dark:border-dark-400 dark:text-dark-1000 dark:focus:border-dark-600"
          />
          <datalist id={`${fieldKey}-datalist`}>
            {Object.entries(options).map(([key, label]) => (
              <option key={key} value={label} />
            ))}
            {(suggestions as string[] ?? []).map((val: string) => (
              <option key={`suggestion-${val}`} value={val} />
            ))}
          </datalist>
        </>
      ) : (
        <div className="flex flex-col gap-1">
          {Object.entries(options).map(([key, label]) => (
            <label key={key} className="flex cursor-pointer items-center gap-2 text-sm text-neutral-800 dark:text-dark-900">
              <input
                type={style === "radio" ? "radio" : "checkbox"}
                name={`${fieldKey}-edit`}
                value={key}
                checked={draft.includes(key)}
                onChange={(e) => handleDraftCheckboxChange(key, e.target.checked)}
                className="rounded"
              />
              {label}
            </label>
          ))}
          {otherLabel &&
            renderOtherOption({
              checked: otherActive || customValueOf(draft) !== "",
              name: `${fieldKey}-edit`,
              onToggle: handleDraftOtherToggle,
              onTextChange: handleDraftOtherTextChange,
            })}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={commitEdit}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-dark-200"
        >
          <HiCheck className="h-3.5 w-3.5" /> {t`Save`}
        </button>
        <button
          type="button"
          onClick={cancelEdit}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-neutral-500 hover:bg-light-200 dark:text-dark-700 dark:hover:bg-dark-200"
        >
          <HiXMark className="h-3.5 w-3.5" /> {t`Cancel`}
        </button>
      </div>
    </div>
  );
}
