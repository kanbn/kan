import { useState, useEffect } from "react";
import { t } from "@lingui/core/macro";
import { HiCheck, HiXMark } from "react-icons/hi2";
import type { CustomFieldDef } from "@kan/shared";

interface AddressValue {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

interface Props {
  fieldKey: string;
  field: CustomFieldDef;
  value: AddressValue | null;
  onChange: (value: AddressValue | null) => void;
  canEdit?: boolean;
  isSidebar?: boolean;
  embedded?: boolean;
  triggerAddCount?: number;
}

export function AddressField({
  field,
  fieldKey,
  value,
  onChange,
  canEdit = true,
  isSidebar = false,
  embedded = false,
  triggerAddCount = 0,
}: Props) {
  const [isEditing, setIsEditing] = useState(embedded);
  const [draft, setDraft] = useState<AddressValue>(value ?? {});

  useEffect(() => {
    setDraft(value ?? {});
  }, [value]);

  useEffect(() => {
    if (triggerAddCount > 0 && canEdit && !isEditing) {
      setIsEditing(true);
    }
  }, [triggerAddCount, canEdit]);

  const handleInputChange = (key: keyof AddressValue, val: string) => {
    const newDraft = { ...draft, [key]: val };
    setDraft(newDraft);
    if (embedded) {
      const isEmpty = Object.values(newDraft).every((v) => !v);
      onChange(isEmpty ? null : newDraft);
    }
  };

  const handleSave = () => {
    const isEmpty = Object.values(draft).every((v) => !v);
    onChange(isEmpty ? null : draft);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraft(value ?? {});
    setIsEditing(false);
  };

  const inputClass =
    "w-full rounded bg-light-50 px-2 py-1.5 text-sm text-neutral-900 border border-light-400 focus:border-neutral-400 focus:outline-none " +
    "dark:bg-dark-100 dark:text-dark-1000 dark:border-dark-700 dark:focus:border-dark-600 mb-2";

  const staticLabelClass =
    "text-[10px] uppercase text-neutral-500 mb-0.5 block font-semibold";

  if (!isEditing && !embedded) {
    const isEmpty = !value || Object.values(value).every((v) => !v);

    return (
      <div
        className={`kan-custom-field kan-field-${fieldKey} group flex flex-col`}
      >
        <div
          className={`flex w-full cursor-pointer items-center justify-between rounded px-2 py-1 text-sm transition-colors hover:bg-light-100 dark:hover:bg-dark-100 ${
            isSidebar ? "" : "-mx-2"
          }`}
          onClick={() => canEdit && setIsEditing(true)}
        >
          {isEmpty ? (
            <span className="flex items-center gap-1 italic text-neutral-400 dark:text-dark-600">
              {field.placeholder ?? t`Set address`}
            </span>
          ) : (
            <div className="flex flex-col text-neutral-900 dark:text-dark-1000">
              {value.line1 && <div>{value.line1}</div>}
              {value.line2 && <div>{value.line2}</div>}
              {(value.city ?? value.state ?? value.zip) && (
                <div>
                  {[value.city, value.state].filter(Boolean).join(", ")}{" "}
                  {value.zip}
                </div>
              )}
              {!isSidebar && value.country && <div>{value.country}</div>}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative flex flex-col ${isSidebar ? "w-full" : "max-w-xl"}`}
    >
      <div className="mb-2">
        <label className={staticLabelClass}>{t`Line 1`}</label>
        {canEdit ? (
          <input
            className={inputClass}
            value={draft.line1 ?? ""}
            onChange={(e) => handleInputChange("line1", e.target.value)}
            placeholder={t`Street address, P.O. box...`}
          />
        ) : (
          <div className="mb-2 text-sm">{value?.line1}</div>
        )}
      </div>

      <div className="mb-2">
        <label className={staticLabelClass}>{t`Line 2`}</label>
        {canEdit ? (
          <input
            className={inputClass}
            value={draft.line2 ?? ""}
            onChange={(e) => handleInputChange("line2", e.target.value)}
            placeholder={t`Apartment, suite, unit, building, floor, etc.`}
          />
        ) : (
          value?.line2 && <div className="mb-2 text-sm">{value.line2}</div>
        )}
      </div>

      <div className="flex gap-2">
        <div className="mb-2 flex-[2]">
          <label className={staticLabelClass}>{t`City`}</label>
          {canEdit ? (
            <input
              className={inputClass}
              value={draft.city ?? ""}
              onChange={(e) => handleInputChange("city", e.target.value)}
              placeholder={t`City`}
            />
          ) : (
            <div className="text-sm">{value?.city}</div>
          )}
        </div>
        <div className="mb-2 flex-1">
          <label className={staticLabelClass}>{t`State`}</label>
          {canEdit ? (
            <input
              className={inputClass}
              value={draft.state ?? ""}
              onChange={(e) => handleInputChange("state", e.target.value)}
              placeholder={t`State`}
            />
          ) : (
            <div className="text-sm">{value?.state}</div>
          )}
        </div>
        <div className="mb-2 flex-1">
          <label className={staticLabelClass}>{t`Zip`}</label>
          {canEdit ? (
            <input
              className={inputClass}
              value={draft.zip ?? ""}
              onChange={(e) => handleInputChange("zip", e.target.value)}
              placeholder={t`Zip`}
            />
          ) : (
            <div className="text-sm">{value?.zip}</div>
          )}
        </div>
      </div>

      {!isSidebar && (
        <div className="mb-2">
          <label className={staticLabelClass}>{t`Country`}</label>
          {canEdit ? (
            <input
              className={inputClass}
              value={draft.country ?? ""}
              onChange={(e) => handleInputChange("country", e.target.value)}
              placeholder={t`Country`}
            />
          ) : (
            value?.country && <div className="mb-2 text-sm">{value.country}</div>
          )}
        </div>
      )}

      {canEdit && !embedded && (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-dark-200"
          >
            <HiCheck className="h-3.5 w-3.5" />
            {t`Save`}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-neutral-500 hover:bg-light-200 dark:text-dark-700 dark:hover:bg-dark-200"
          >
            <HiXMark className="h-3.5 w-3.5" />
            {t`Cancel`}
          </button>
        </div>
      )}
    </div>
  );
}

