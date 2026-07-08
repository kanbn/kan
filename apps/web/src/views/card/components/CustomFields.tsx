import { useState } from "react";

import type { CustomFieldsConfig, CustomTopLevelSection } from "@kan/shared";
import {
  getCustomSections,
  getSidebarCustomFields,
  getMainCustomFields,
} from "@kan/shared";
import type { WorkspaceMember } from "~/components/Editor";
import { api } from "~/utils/api";

import { FieldRenderer } from "./custom-fields/FieldRenderer";
import { FieldHeader } from "./custom-fields/FieldHeader";
import { TimeseriesField } from "./custom-fields/TimeseriesField";

interface Props {
  panel: "main" | "sidebar";
  cardPublicId: string;
  boardPublicId: string;
  config: CustomFieldsConfig;
  customData: Record<string, unknown> | null;
  workspaceMembers: WorkspaceMember[];
  canEdit?: boolean;
}

export function CustomFields({
  panel,
  cardPublicId,
  boardPublicId,
  config,
  customData,
  workspaceMembers,
  canEdit = true,
}: Props) {
  const utils = api.useUtils();

  const updateCard = api.card.update.useMutation({
    onSettled: () => {
      void utils.card.byId.invalidate({ cardPublicId });
    },
  });

  const handleSectionChange = (sectionKey: string, newSectionValue: unknown) => {
    const merged: Record<string, unknown> = {
      ...(customData ?? {}),
      [sectionKey]: newSectionValue,
    };
    updateCard.mutate({ cardPublicId, customData: merged });
  };

  const handleFieldChange = (
    sectionKey: string,
    fieldKey: string,
    newValue: unknown,
  ) => {
    const section =
      customData?.[sectionKey] != null &&
      typeof customData[sectionKey] === "object" &&
      !Array.isArray(customData[sectionKey])
        ? (customData[sectionKey] as Record<string, unknown>)
        : {};
    handleSectionChange(sectionKey, { ...section, [fieldKey]: newValue });
  };

  if (panel === "main") {
    const sections = getCustomSections(config);
    const mainFields = getMainCustomFields(config);
    if (!sections.length && !mainFields.length) return null;

    return (
      <div className="flex flex-col gap-5 pb-4">
        {mainFields.length > 0 && (
          <div className="kan-custom-section kan-section-main flex flex-col gap-3 border-t border-light-200 pt-4 dark:border-dark-300">
            {mainFields.map(({ key, field }) => (
              <CardDetailField
                key={key}
                fieldKey={key}
                field={field}
                value={
                  (customData?.main as Record<string, unknown> | undefined)?.[
                    key
                  ]
                }
                onChange={(v) => handleFieldChange("main", key, v)}
                workspaceMembers={workspaceMembers}
                canEdit={canEdit}
                boardPublicId={boardPublicId}
                sectionKey="main"
              />
            ))}
          </div>
        )}

        {sections.map(({ key, section }) =>
          section.type === "timeseries" ? (
            <TimeseriesSection
              key={key}
              sectionKey={key}
              section={section}
              customData={customData}
              workspaceMembers={workspaceMembers}
              canEdit={canEdit}
              boardPublicId={boardPublicId}
              onSectionChange={handleSectionChange}
            />
          ) : (
            <RegularSection
              key={key}
              sectionKey={key}
              section={section}
              customData={customData}
              workspaceMembers={workspaceMembers}
              canEdit={canEdit}
              boardPublicId={boardPublicId}
              onFieldChange={handleFieldChange}
            />
          ),
        )}
      </div>
    );
  }

  // sidebar panel — render sidebar custom fields (beyond built-ins)
  const sidebarCustom = getSidebarCustomFields(config);
  if (!sidebarCustom.length) return null;

  return (
    <div className="flex flex-col">
      {sidebarCustom.map(({ key, field }) => (
        <CardDetailField
          key={key}
          fieldKey={key}
          field={field}
          value={
            (customData?.sidebar as Record<string, unknown> | undefined)?.[key]
          }
          onChange={(v) => handleFieldChange("sidebar", key, v)}
          workspaceMembers={workspaceMembers}
          canEdit={canEdit}
          boardPublicId={boardPublicId}
          sectionKey="sidebar"
          isSidebar={true}
        />
      ))}
    </div>
  );
}


// ─── Card Detail Fields ──────────────────────────────────────────────────────

interface CardDetailFieldProps {
  fieldKey: string;
  field: any;
  value: any;
  onChange: (v: any) => void;
  workspaceMembers: WorkspaceMember[];
  canEdit: boolean;
  boardPublicId: string;
  sectionKey?: string;
  isSidebar?: boolean;
}

function CardDetailField({
  fieldKey,
  field,
  value,
  onChange,
  workspaceMembers,
  canEdit,
  boardPublicId,
  sectionKey,
  isSidebar = false,
}: CardDetailFieldProps) {
  const isComplex =
    field.type === "list" ||
    field.type === "timeseries" ||
    field.type === "keyvalue" ||
    field.type === "address";

  const empty =
    value == null ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === "object" && Object.keys(value).length === 0);

  const [collapsed, setCollapsed] = useState(!field.alwaysExpanded && empty);
  const [triggerAddCount, setTriggerAddCount] = useState(0);

  const handleAdd = () => {
    setCollapsed(false);
    setTriggerAddCount((c) => c + 1);
  };

  const handleToggle = () => {
    if (collapsed && empty) {
      handleAdd();
    } else {
      setCollapsed(!collapsed);
    }
  };

  if (!isComplex) {
    return (
      <div
        key={fieldKey}
        className={`flex ${isSidebar ? "flex-row mb-4" : "flex-col"}`}
      >
        {!field.hideLabel && (
          <label
            className={`${
              isSidebar
                ? "my-2 w-[100px] shrink-0 text-sm font-medium"
                : "mb-2 block text-xs font-medium text-[rgb(126,126,126)] dark:text-dark-800"
            }`}
          >
            {field.title}
          </label>
        )}
        <div className="flex-1">
          <FieldRenderer
            fieldKey={fieldKey}
            field={field}
            value={value}
            onChange={onChange}
            workspaceMembers={workspaceMembers}
            canEdit={canEdit}
            boardPublicId={boardPublicId}
            sectionKey={sectionKey}
            isSidebar={isSidebar}
          />
          {field.description && (
            <p className="mt-1 text-[11px] text-neutral-500 dark:text-dark-700">
              {field.description}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div key={fieldKey} className="flex flex-col">
      <FieldHeader
        title={field.title}
        onToggle={handleToggle}
        onAdd={
          canEdit && !(field.type === "address" && !collapsed)
            ? handleAdd
            : undefined
        }
        collapsed={collapsed}
      />
      {!collapsed && (
        <div className="pl-4">
          <FieldRenderer
            fieldKey={fieldKey}
            field={field}
            value={value}
            onChange={onChange}
            workspaceMembers={workspaceMembers}
            canEdit={canEdit}
            boardPublicId={boardPublicId}
            sectionKey={sectionKey}
            triggerAddCount={triggerAddCount}
          />
        </div>
      )}
    </div>
  );
}

// ─── Section sub-components ───────────────────────────────────────────────────

interface SectionProps {
  sectionKey: string;
  section: CustomTopLevelSection;
  customData: Record<string, unknown> | null;
  workspaceMembers: WorkspaceMember[];
  canEdit: boolean;
  boardPublicId: string;
  onFieldChange: (sectionKey: string, fieldKey: string, value: unknown) => void;
}

function RegularSection({
  sectionKey,
  section,
  customData,
  workspaceMembers,
  canEdit,
  boardPublicId,
  onFieldChange,
}: SectionProps) {
  const fields = section.fields ?? {};
  const sectionData =
    customData?.[sectionKey] != null &&
    typeof customData[sectionKey] === "object" &&
    !Array.isArray(customData[sectionKey])
      ? (customData[sectionKey] as Record<string, unknown>)
      : {};

  const allFieldsEmpty = Object.keys(fields).every((key) => {
    const val = sectionData[key];
    return (
      val == null ||
      val === "" ||
      (Array.isArray(val) && val.length === 0) ||
      (typeof val === "object" && Object.keys(val).length === 0)
    );
  });

  const [collapsed, setCollapsed] = useState(
    !section.alwaysExpanded && allFieldsEmpty,
  );

  const handleToggle = () => {
    setCollapsed(!collapsed);
  };

  if (!Object.keys(fields).length) return null;

  const handlePlusClick = () => {
    setCollapsed(false);
  };

  return (
    <div
      className={`kan-custom-section kan-section-${sectionKey} border-t border-light-200 pt-4 dark:border-dark-300`}
      data-section-key={sectionKey}
    >
      <FieldHeader
        title={section.title ?? sectionKey}
        onToggle={handleToggle}
        onAdd={
          canEdit && section.type !== "section" && section.type !== undefined
            ? handlePlusClick
            : undefined
        }
        collapsed={collapsed}
        canEdit={canEdit}
        isSection={section.type === "section" || section.type === undefined}
      />

      {!collapsed && (
        <div className="flex flex-col gap-3 pl-5 pt-2">
          {Object.entries(fields).map(([fieldKey, field]) => (
            <CardDetailField
              key={fieldKey}
              fieldKey={fieldKey}
              field={field}
              value={sectionData[fieldKey]}
              onChange={(v) => onFieldChange(sectionKey, fieldKey, v)}
              workspaceMembers={workspaceMembers}
              canEdit={canEdit}
              boardPublicId={boardPublicId}
              sectionKey={sectionKey}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface TimeseriesSectionProps {
  sectionKey: string;
  section: CustomTopLevelSection;
  customData: Record<string, unknown> | null;
  workspaceMembers: WorkspaceMember[];
  canEdit: boolean;
  boardPublicId: string;
  onSectionChange: (sectionKey: string, value: unknown) => void;
}

function TimeseriesSection({
  sectionKey,
  section,
  customData,
  workspaceMembers,
  canEdit,
  boardPublicId,
  onSectionChange,
}: TimeseriesSectionProps) {
  const value = customData?.[sectionKey];
  const empty =
    value == null ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === "object" && Object.keys(value).length === 0);

  const [collapsed, setCollapsed] = useState(!section.alwaysExpanded && empty);
  const [triggerAddCount, setTriggerAddCount] = useState(0);

  // Fake a CustomFieldDef to pass to TimeseriesField
  const pseudoField = {
    title: section.title ?? sectionKey,
    type: "timeseries" as const,
    fields: section.fields,
  };

  const handleAdd = () => {
    setCollapsed(false);
    setTriggerAddCount((c) => c + 1);
  };

  const handleToggle = () => {
    if (collapsed && empty) {
      handleAdd();
    } else {
      setCollapsed(!collapsed);
    }
  };

  return (
    <div
      className={`kan-custom-section kan-section-${sectionKey} border-t border-light-200 pt-4 dark:border-dark-300`}
      data-section-key={sectionKey}
    >
      <FieldHeader
        title={section.title ?? sectionKey}
        onToggle={handleToggle}
        onAdd={canEdit ? handleAdd : undefined}
        collapsed={collapsed}
        canEdit={canEdit}
      />

      {!collapsed && (
        <div className="pl-5 pt-2">
          <TimeseriesField
            sectionKey={sectionKey}
            field={pseudoField}
            value={value}
            onChange={(v) => onSectionChange(sectionKey, v)}
            workspaceMembers={workspaceMembers}
            canEdit={canEdit}
            triggerAddCount={triggerAddCount}
            boardPublicId={boardPublicId}
          />
        </div>
      )}
    </div>
  );
}
