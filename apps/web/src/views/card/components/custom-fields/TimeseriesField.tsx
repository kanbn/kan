import { t } from "@lingui/core/macro";
import { useEffect, useState } from "react";
import { HiPencil, HiPlus, HiXMark, HiCheck } from "react-icons/hi2";

import type { CustomFieldDef } from "@kan/shared";
import type { WorkspaceMember } from "~/components/Editor";

import { FieldRenderer } from "./FieldRenderer";

interface TimeseriesEntry {
  timestamp: string;
  [key: string]: unknown;
}

interface Props {
  sectionKey: string;
  field: CustomFieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
  workspaceMembers: WorkspaceMember[];
  canEdit?: boolean;
  triggerAddCount?: number;
  boardPublicId: string;
}

export function TimeseriesField({
  sectionKey,
  field,
  value,
  onChange,
  workspaceMembers,
  canEdit = true,
  triggerAddCount = 0,
  boardPublicId,
}: Props) {
  const entries = Array.isArray(value)
    ? (value as TimeseriesEntry[])
        .slice()
        .sort(
          (a, b) =>
            new Date(b.timestamp ?? 0).getTime() -
            new Date(a.timestamp ?? 0).getTime(),
        )
    : [];

  // Track original (pre-sort) order so we can splice by original index
  const originalEntries = Array.isArray(value)
    ? (value as TimeseriesEntry[])
    : [];

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draftEntry, setDraftEntry] = useState<TimeseriesEntry | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (triggerAddCount > 0 && canEdit && !isAdding) {
      handleStartAdd();
    }
  }, [triggerAddCount]);

  const subFields = field.fields ?? {};

  const nowISO = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  };

  const handleStartAdd = () => {
    setDraftEntry({ timestamp: nowISO() });
    setIsAdding(true);
    setEditingIndex(null);
  };

  const handleStartEdit = (sortedIndex: number) => {
    setDraftEntry({ ...entries[sortedIndex]! });
    setEditingIndex(sortedIndex);
    setIsAdding(false);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setDraftEntry(null);
    setIsAdding(false);
  };

  const handleCommitAdd = () => {
    if (!draftEntry) return;
    onChange([...originalEntries, draftEntry]);
    setDraftEntry(null);
    setIsAdding(false);
  };

  const handleCommitEdit = (sortedIndex: number) => {
    if (!draftEntry) return;
    const originalIndex = originalEntries.findIndex(
      (e) => e === entries[sortedIndex],
    );
    const updated = originalEntries.map((e, i) =>
      i === originalIndex ? draftEntry : e,
    );
    onChange(updated);
    setEditingIndex(null);
    setDraftEntry(null);
  };

  const handleRemove = (sortedIndex: number) => {
    const original = entries[sortedIndex];
    onChange(originalEntries.filter((e) => e !== original));
  };

  const handleDraftChange = (key: string, v: unknown) => {
    setDraftEntry((prev) => ({ ...(prev ?? { timestamp: "" }), [key]: v }));
  };

  const formatTimestamp = (ts: string) => {
    if (!ts) return "";
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return ts;
    }
  };

  const renderEntryFields = (
    entry: TimeseriesEntry,
    onFieldChange: (key: string, v: unknown) => void,
  ) => (
    <div className="flex flex-col gap-2">
      {/* Timestamp field */}
      <div>
        <label className="mb-2 block text-xs font-medium text-[rgb(126,126,126)] dark:text-dark-800">
          {subFields["timestamp"]?.title ?? t`Timestamp`}
        </label>
        <input
          type="datetime-local"
          className="w-full rounded border border-light-400 bg-light-50 px-2 py-1.5 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none dark:border-dark-700 dark:bg-dark-100 dark:text-dark-1000"
          value={entry.timestamp ?? ""}
          onChange={(e) => onFieldChange("timestamp", e.target.value)}
        />
      </div>

      {/* Remaining sub-fields */}
      {Object.entries(subFields)
        .filter(([k]) => k !== "timestamp")
        .map(([subKey, subField]) => (
          <div key={subKey}>
            {!subField.hideLabel && (
              <label className="mb-2 block text-xs font-medium text-[rgb(126,126,126)] dark:text-dark-800">
                {subField.title}
              </label>
            )}
            <FieldRenderer
              fieldKey={subKey}
              field={subField}
              value={entry[subKey]}
              onChange={(v) => onFieldChange(subKey, v)}
              workspaceMembers={workspaceMembers}
              canEdit={canEdit}
              embedded
              boardPublicId={boardPublicId}
              sectionKey={sectionKey}
            />
            {subField.description && (
              <p className="mt-1 text-[11px] text-neutral-500 dark:text-dark-700">
                {subField.description}
              </p>
            )}
          </div>
        ))}
    </div>
  );

  return (
    <div
      className={`kan-custom-section kan-section-${sectionKey} flex flex-col gap-3`}
      data-section-key={sectionKey}
    >
      {/* Existing entries */}
      {entries.map((entry, sortedIndex) => (
        <div
          key={sortedIndex}
          className="py-1"
        >
          {editingIndex === sortedIndex ? (
            <div>
              {renderEntryFields(draftEntry!, handleDraftChange)}
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleCommitEdit(sortedIndex)}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-dark-200"
                >
                  <HiCheck className="h-3.5 w-3.5" /> {t`Save`}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-neutral-500 hover:bg-light-200 dark:text-dark-700 dark:hover:bg-dark-200"
                >
                  <HiXMark className="h-3.5 w-3.5" /> {t`Cancel`}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-neutral-900 dark:text-dark-1000">
                  {formatTimestamp(entry.timestamp)}
                </span>
                {Object.entries(subFields)
                  .filter(([k]) => k !== "timestamp")
                  .map(([subKey, subField]) =>
                    entry[subKey] != null && entry[subKey] !== "" ? (
                      <span key={subKey} className="text-sm">
                        <span className="font-medium text-neutral-800 dark:text-dark-900">{subField.title}</span>
                        <span className="mx-1 text-neutral-400 dark:text-dark-600">:</span>
                        <span className="text-neutral-900 dark:text-dark-1000">{String(entry[subKey])}</span>
                      </span>
                    ) : null,
                  )}
              </div>
              {canEdit && (
                <div className="flex shrink-0 gap-1 pl-2">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(sortedIndex)}
                    className="rounded p-1 text-neutral-400 hover:bg-light-200 hover:text-neutral-700 dark:text-dark-700 dark:hover:bg-dark-300"
                    aria-label={t`Edit entry`}
                  >
                    <HiPencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(sortedIndex)}
                    className="rounded p-1 text-neutral-400 hover:bg-light-200 hover:text-neutral-700 dark:text-dark-700 dark:hover:bg-dark-300"
                    aria-label={t`Delete entry`}
                  >
                    <HiXMark className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* New entry form */}
      {isAdding && draftEntry && (
        <div className="py-1">
          {renderEntryFields(draftEntry, handleDraftChange)}
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
              onClick={handleCancelEdit}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-neutral-500 hover:bg-light-200 dark:text-dark-700 dark:hover:bg-dark-200"
            >
              <HiXMark className="h-3.5 w-3.5" /> {t`Cancel`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
