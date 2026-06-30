import { t } from "@lingui/core/macro";
import { useState } from "react";
import { HiCheck, HiPencil, HiPlus, HiXMark } from "react-icons/hi2";

import type { CustomFieldDef } from "@kan/shared";
import type { WorkspaceMember } from "~/components/Editor";

import { FieldRenderer } from "./FieldRenderer";

interface Props {
  sectionKey: string;
  field: CustomFieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
  workspaceMembers: WorkspaceMember[];
  canEdit?: boolean;
  isList?: boolean;
}

export function SectionField({
  sectionKey,
  field,
  value,
  onChange,
  workspaceMembers,
  canEdit = true,
  isList = false,
}: Props) {
  const subFields = field.fields ?? {};

  if (isList) {
    return (
      <MultipleSection
        sectionKey={sectionKey}
        subFields={subFields}
        value={value}
        onChange={onChange}
        workspaceMembers={workspaceMembers}
        canEdit={canEdit}
      />
    );
  }

  // Single record section
  const record =
    value != null && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  const handleChange = (fieldKey: string, newValue: unknown) => {
    onChange({ ...record, [fieldKey]: newValue });
  };

  return (
    <div
      className={`kan-custom-section kan-section-${sectionKey} flex flex-col gap-2`}
      data-section-key={sectionKey}
    >
      {Object.entries(subFields).map(([subKey, subField]) => (
        <div key={subKey}>
          {!subField.hideLabel && (
            <label className="mb-2 block text-xs font-medium text-[rgb(126,126,126)] dark:text-dark-800">
              {subField.title}
            </label>
          )}
          <FieldRenderer
            fieldKey={subKey}
            field={subField}
            value={record[subKey]}
            onChange={(v) => handleChange(subKey, v)}
            workspaceMembers={workspaceMembers}
            canEdit={canEdit}
            embedded
          />
        </div>
      ))}
    </div>
  );
}

// ─── Multiple-record sub-component ───────────────────────────────────────────

interface MultipleSectionProps {
  sectionKey: string;
  subFields: Record<string, CustomFieldDef>;
  value: unknown;
  onChange: (value: unknown) => void;
  workspaceMembers: WorkspaceMember[];
  canEdit: boolean;
}

function MultipleSection({
  sectionKey,
  subFields,
  value,
  onChange,
  workspaceMembers,
  canEdit,
}: MultipleSectionProps) {
  const records = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draftRecord, setDraftRecord] = useState<Record<string, unknown> | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const handleStartEdit = (index: number) => {
    setDraftRecord({ ...records[index] });
    setEditingIndex(index);
    setIsAdding(false);
  };

  const handleStartAdd = () => {
    setDraftRecord({});
    setIsAdding(true);
    setEditingIndex(null);
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setDraftRecord(null);
    setIsAdding(false);
  };

  const handleCommitEdit = (index: number) => {
    if (!draftRecord) return;
    onChange(records.map((rec, i) => (i === index ? draftRecord : rec)));
    setEditingIndex(null);
    setDraftRecord(null);
  };

  const handleCommitAdd = () => {
    if (!draftRecord) return;
    onChange([...records, draftRecord]);
    setDraftRecord(null);
    setIsAdding(false);
  };

  const handleRemove = (index: number) => {
    onChange(records.filter((_, i) => i !== index));
  };

  const handleDraftChange = (fieldKey: string, v: unknown) => {
    setDraftRecord((prev) => ({ ...(prev ?? {}), [fieldKey]: v }));
  };

  const renderRecordFields = (
    record: Record<string, unknown>,
    onFieldChange: (key: string, v: unknown) => void,
  ) => (
    <div className="flex flex-col gap-2">
      {Object.entries(subFields).map(([subKey, subField]) => (
        <div key={subKey}>
          {!subField.hideLabel && (
            <label className="mb-2 block text-xs font-medium text-[rgb(126,126,126)] dark:text-dark-800">
              {subField.title}
            </label>
          )}
          <FieldRenderer
            fieldKey={subKey}
            field={subField}
            value={record[subKey]}
            onChange={(v) => onFieldChange(subKey, v)}
            workspaceMembers={workspaceMembers}
            canEdit
            embedded
          />
        </div>
      ))}
    </div>
  );

  const getSummary = (record: Record<string, unknown>) => {
    const firstEntry = Object.entries(subFields)[0];
    if (!firstEntry) return null;
    const [firstKey, firstField] = firstEntry;
    const val = record[firstKey];
    if (val == null || val === "") return null;
    return { title: firstField.title, value: String(val), hideLabel: firstField.hideLabel };
  };

  return (
    <div
      className={`kan-custom-section kan-section-${sectionKey} flex flex-col gap-3`}
      data-section-key={sectionKey}
    >
      {/* Existing entries */}
      {records.map((record, index) => (
        <div
          key={index}
          className="py-1"
        >
          {editingIndex === index ? (
            <div>
              {renderRecordFields(draftRecord!, handleDraftChange)}
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleCommitEdit(index)}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-dark-200"
                >
                  <HiCheck className="h-3.5 w-3.5" /> {t`Save`}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-neutral-500 hover:bg-light-200 dark:text-dark-700 dark:hover:bg-dark-200"
                >
                  <HiXMark className="h-3.5 w-3.5" /> {t`Cancel`}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-0.5">
                {(() => {
                  const summary = getSummary(record);
                  if (summary) {
                    return (
                      <span className="text-sm font-semibold text-neutral-900 dark:text-dark-1000">
                        {!summary.hideLabel && (
                          <span className="text-neutral-500 dark:text-dark-600 font-medium mr-1">{summary.title}:</span>
                        )}
                        {summary.value}
                      </span>
                    );
                  }
                  return (
                    <span className="text-xs italic text-neutral-400 dark:text-dark-600">
                      {t`(empty record)`}
                    </span>
                  );
                })()}
                {Object.entries(subFields)
                  .slice(1)
                  .map(([subKey, subField]) =>
                    record[subKey] != null && record[subKey] !== "" ? (
                      <span key={subKey} className="text-sm">
                        {!subField.hideLabel && (
                          <>
                            <span className="font-medium text-neutral-800 dark:text-dark-900">{subField.title}</span>
                            <span className="mx-1 text-neutral-400 dark:text-dark-600">:</span>
                          </>
                        )}
                        <span className="text-neutral-900 dark:text-dark-1000">{String(record[subKey])}</span>
                      </span>
                    ) : null,
                  )}
              </div>
              {canEdit && (
                <div className="flex shrink-0 gap-1 pl-2">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(index)}
                    className="rounded p-1 text-neutral-400 hover:bg-light-200 hover:text-neutral-700 dark:text-dark-700 dark:hover:bg-dark-300"
                    aria-label={t`Edit record`}
                  >
                    <HiPencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="rounded p-1 text-neutral-400 hover:bg-light-200 hover:text-neutral-700 dark:text-dark-700 dark:hover:bg-dark-300"
                    aria-label={t`Remove record`}
                  >
                    <HiXMark className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {isAdding && draftRecord && (
        <div className="py-1">
          {renderRecordFields(draftRecord, handleDraftChange)}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={handleCommitAdd}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-dark-200"
            >
              <HiCheck className="h-3.5 w-3.5" /> {t`Add`}
            </button>
            <button
              type="button"
              onClick={handleCancel}
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
          onClick={handleStartAdd}
          className="flex items-center mt-1 gap-1 text-[11px] text-neutral-600 hover:text-neutral-900 dark:text-dark-800 dark:hover:text-dark-1000"
        >
          <HiPlus className="h-3 w-3" /> {t`Add record`}
        </button>
      )}
    </div>
  );
}


