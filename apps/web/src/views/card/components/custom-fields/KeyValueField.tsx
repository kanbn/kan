import { t } from "@lingui/core/macro";
import { useState } from "react";
import { HiCheck, HiPencil, HiPlus, HiTrash, HiXMark } from "react-icons/hi2";

import type { CustomFieldDef } from "@kan/shared";
import type { WorkspaceMember } from "~/components/Editor";

import { FieldRenderer } from "./FieldRenderer";

interface KeyValuePair {
  key: string;
  value: unknown;
}

interface Props {
  fieldKey: string;
  field: CustomFieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
  workspaceMembers: WorkspaceMember[];
  canEdit?: boolean;
}

export function KeyValueField({
  fieldKey,
  field,
  value,
  onChange,
  workspaceMembers,
  canEdit = true,
}: Props) {
  const subFields = field.fields ?? {};
  const fieldKeys = Object.keys(subFields);
  const keyFieldKey = fieldKeys[0];
  const valueFieldKey = fieldKeys[1];
  const keyField = keyFieldKey ? subFields[keyFieldKey] : undefined;
  const valueField = valueFieldKey ? subFields[valueFieldKey] : undefined;

  if (!keyField || !valueField) {
    return (
      <div className="text-sm italic text-neutral-400">
        {t`Key-value field must have exactly 2 fields defined`}
      </div>
    );
  }

  // Parse value as object map (Record<string, unknown>) to array of key-value pairs
  const pairs: KeyValuePair[] =
    value && typeof value === "object" && !Array.isArray(value)
      ? Object.entries(value).map(([key, val]) => ({ key, value: val }))
      : [];

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [draftKey, setDraftKey] = useState("");
  const [draftValue, setDraftValue] = useState<unknown>(null);

  const startEdit = (index: number) => {
    if (!canEdit) return;
    const pair = pairs[index];
    if (pair) {
      setDraftKey(pair.key);
      setDraftValue(pair.value);
      setEditingIndex(index);
    }
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setDraftKey("");
    setDraftValue(null);
  };

  const commitEdit = () => {
    if (editingIndex === null) return;
    const updated = [...pairs];
    updated[editingIndex] = { key: draftKey, value: draftValue };
    onChange(Object.fromEntries(updated.map((p) => [p.key, p.value])));
    cancelEdit();
  };

  const deletePair = (index: number) => {
    if (!canEdit) return;
    const updated = pairs.filter((_, i) => i !== index);
    onChange(
      updated.length > 0
        ? Object.fromEntries(updated.map((p) => [p.key, p.value]))
        : null
    );
  };

  const startAdd = () => {
    if (!canEdit) return;
    setDraftKey("");
    setDraftValue(null);
    setIsAdding(true);
  };

  const cancelAdd = () => {
    setIsAdding(false);
    setDraftKey("");
    setDraftValue(null);
  };

  const commitAdd = () => {
    if (!draftKey.trim()) return;
    const updated = [...pairs, { key: draftKey, value: draftValue }];
    onChange(Object.fromEntries(updated.map((p) => [p.key, p.value])));
    cancelAdd();
  };

  // Helper to get display label for a key (if it's a select field with options)
  const getKeyDisplayLabel = (key: string): string => {
    if (keyField.type === "select" && keyField.options) {
      return keyField.options[key] ?? key;
    }
    return key;
  };

  // Helper to get display value for a key-value pair
  const getDisplayValue = (pair: KeyValuePair): string => {
    if (valueField.type === "select" && valueField.options) {
      const label = valueField.options[String(pair.value ?? "")];
      return label ?? String(pair.value ?? "");
    }
    if (pair.value == null) return "";
    if (typeof pair.value === "string") return pair.value;
    if (typeof pair.value === "number" || typeof pair.value === "boolean") {
      return String(pair.value);
    }
    return JSON.stringify(pair.value);
  };

  return (
    <div
      className={`kan-custom-field kan-field-${fieldKey} flex flex-col gap-1 mb-2`}
      data-field-key={fieldKey}
    >
      {pairs.map((pair, index) => (
        <div key={index}>
          {editingIndex === index ? (
            // Edit mode
            <div className="flex flex-col gap-2">
              <div>
                {!keyField.hideLabel && (
                  <label className="mb-2 block text-xs font-medium text-[rgb(126,126,126)] dark:text-dark-800">
                    {keyField.title}
                  </label>
                )}
                <FieldRenderer
                  fieldKey={`${fieldKey}-edit-key`}
                  field={keyField}
                  value={draftKey}
                  onChange={(v) => setDraftKey(String(v ?? ""))}
                  workspaceMembers={workspaceMembers}
                  canEdit={true}
                  embedded
                />
              </div>
              <div>
                {!valueField.hideLabel && (
                  <label className="mb-2 block text-xs font-medium text-[rgb(126,126,126)] dark:text-dark-800">
                    {valueField.title}
                  </label>
                )}
                <FieldRenderer
                  fieldKey={`${fieldKey}-edit-value`}
                  field={valueField}
                  value={draftValue}
                  onChange={setDraftValue}
                  workspaceMembers={workspaceMembers}
                  canEdit={true}
                  embedded
                />
              </div>
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
          ) : (
            // Read mode
            <div className="group flex items-center justify-between rounded bg-transparent px-2 -mx-2 hover:bg-light-50 dark:hover:bg-dark-100 text-sm">
              <div className="flex items-center flex-1 gap-2">
                <span className="text-neutral-300 dark:text-dark-700">•</span>
                <div className="flex-1">
                  <span className="font-medium text-neutral-800 dark:text-dark-900">
                    {getKeyDisplayLabel(pair.key)}
                  </span>
                  <span className="mx-1 text-neutral-400 dark:text-dark-600">:</span>
                  <span className="text-neutral-900 dark:text-dark-1000">
                    {getDisplayValue(pair)}
                  </span>
                </div>
              </div>
              {canEdit && (
                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => startEdit(index)}
                    className="rounded p-1 text-neutral-500 hover:bg-light-100 hover:text-neutral-700 dark:text-dark-700 dark:hover:bg-dark-200 dark:hover:text-dark-900"
                    title={t`Edit`}
                  >
                    <HiPencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deletePair(index)}
                    className="rounded p-1 text-neutral-500 hover:bg-red-50 hover:text-red-600 dark:text-dark-700 dark:hover:bg-dark-200 dark:hover:text-red-400"
                    title={t`Delete`}
                  >
                    <HiTrash className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {isAdding && (
        <div className="flex flex-col gap-2 py-1">
          <div>
            <label className="mb-2 block text-xs font-medium text-[rgb(126,126,126)] dark:text-dark-800">
              {keyField.title}
            </label>
            <FieldRenderer
              fieldKey={`${fieldKey}-add-key`}
              field={{ ...keyField, alwaysExpanded: true }}
              value={draftKey}
              onChange={(v) => setDraftKey(String(v ?? ""))}
              workspaceMembers={workspaceMembers}
              canEdit={true}
              embedded
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium text-[rgb(126,126,126)] dark:text-dark-800">
              {valueField.title}
            </label>
            <FieldRenderer
              fieldKey={`${fieldKey}-add-value`}
              field={{ ...valueField, alwaysExpanded: true }}
              value={draftValue}
              onChange={setDraftValue}
              workspaceMembers={workspaceMembers}
              canEdit={true}
              embedded
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={commitAdd}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-dark-200"
            >
              <HiCheck className="h-3.5 w-3.5" /> {t`Add`}
            </button>
            <button
              type="button"
              onClick={cancelAdd}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-neutral-500 hover:bg-light-200 dark:text-dark-700 dark:hover:bg-dark-200"
            >
              <HiXMark className="h-3.5 w-3.5" /> {t`Cancel`}
            </button>
          </div>
        </div>
      )}

      {canEdit && !isAdding && (
        <button
          type="button"
          onClick={startAdd}
          className="flex items-center mt-1 gap-1 self-start text-[11px] text-neutral-600 hover:text-neutral-900 dark:text-dark-800 dark:hover:text-dark-1000"
        >
          <HiPlus className="h-3 w-3" /> {t`Add ${field.title || "Entry"}`}
        </button>
      )}
    </div>
  );
}
