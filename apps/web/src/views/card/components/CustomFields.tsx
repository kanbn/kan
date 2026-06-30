import { useState } from "react";
import { HiChevronDown, HiChevronRight } from "react-icons/hi2";

import type { CustomFieldsConfig, CustomTopLevelSection } from "@kan/shared";
import {
  getCustomSections,
  getSidebarCustomFields,
  getMainCustomFields,
} from "@kan/shared";
import type { WorkspaceMember } from "~/components/Editor";
import { api } from "~/utils/api";

import { FieldRenderer } from "./custom-fields/FieldRenderer";
import { TimeseriesField } from "./custom-fields/TimeseriesField";

interface Props {
  panel: "main" | "sidebar";
  cardPublicId: string;
  config: CustomFieldsConfig;
  customData: Record<string, unknown> | null;
  workspaceMembers: WorkspaceMember[];
  canEdit?: boolean;
}

export function CustomFields({
  panel,
  cardPublicId,
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
              <div key={key} className="flex flex-col">
                <label className="mb-2 block text-xs font-medium text-[rgb(126,126,126)] dark:text-dark-800">
                  {field.title}
                </label>
                <FieldRenderer
                  fieldKey={key}
                  field={field}
                  value={(customData?.main as Record<string, unknown> | undefined)?.[key]}
                  onChange={(v) => handleFieldChange("main", key, v)}
                  workspaceMembers={workspaceMembers}
                  canEdit={canEdit}
                />
              </div>
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
    <div className="flex flex-col gap-3">
      {sidebarCustom.map(({ key, field }) => (
        <div key={key} className={`kan-custom-section kan-section-sidebar`}>
          <p className="mb-2 text-xs font-medium text-[rgb(126,126,126)] dark:text-dark-800">
            {field.title}
          </p>
          <FieldRenderer
            fieldKey={key}
            field={field}
            value={(customData?.sidebar as Record<string, unknown> | undefined)?.[key]}
            onChange={(v) => handleFieldChange("sidebar", key, v)}
            workspaceMembers={workspaceMembers}
            canEdit={canEdit}
          />
        </div>
      ))}
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
  onFieldChange: (sectionKey: string, fieldKey: string, value: unknown) => void;
}

function RegularSection({
  sectionKey,
  section,
  customData,
  workspaceMembers,
  canEdit,
  onFieldChange,
}: SectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const sectionData =
    customData?.[sectionKey] != null &&
    typeof customData[sectionKey] === "object" &&
    !Array.isArray(customData[sectionKey])
      ? (customData[sectionKey] as Record<string, unknown>)
      : {};

  const fields = section.fields ?? {};
  if (!Object.keys(fields).length) return null;

  return (
    <div
      className={`kan-custom-section kan-section-${sectionKey} border-t border-light-200 pt-4 dark:border-dark-300`}
      data-section-key={sectionKey}
    >
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="mb-2 flex w-full items-center gap-1 text-left text-sm font-semibold text-neutral-800 dark:text-dark-1000"
      >
        {collapsed ? (
          <HiChevronRight className="h-4 w-4 shrink-0 text-neutral-400" />
        ) : (
          <HiChevronDown className="h-4 w-4 shrink-0 text-neutral-400" />
        )}
        {section.title ?? sectionKey}
      </button>

      {!collapsed && (
        <div className="flex flex-col gap-3 pl-5 pt-2">
          {Object.entries(fields).map(([fieldKey, field]) => (
            <div key={fieldKey} className="flex flex-col">
              <label className="mb-2 block text-xs font-medium text-[rgb(126,126,126)] dark:text-dark-800">
                {field.title}
              </label>
              <FieldRenderer
                fieldKey={fieldKey}
                field={field}
                value={sectionData[fieldKey]}
                onChange={(v) => onFieldChange(sectionKey, fieldKey, v)}
                workspaceMembers={workspaceMembers}
                canEdit={canEdit}
              />
            </div>
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
  onSectionChange: (sectionKey: string, value: unknown) => void;
}

function TimeseriesSection({
  sectionKey,
  section,
  customData,
  workspaceMembers,
  canEdit,
  onSectionChange,
}: TimeseriesSectionProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Fake a CustomFieldDef to pass to TimeseriesField
  const pseudoField = {
    title: section.title ?? sectionKey,
    type: "timeseries" as const,
    fields: section.fields,
  };

  return (
    <div
      className={`kan-custom-section kan-section-${sectionKey} border-t border-light-200 pt-4 dark:border-dark-300`}
      data-section-key={sectionKey}
    >
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="mb-2 flex w-full items-center gap-1 text-left text-sm font-semibold text-neutral-800 dark:text-dark-1000"
      >
        {collapsed ? (
          <HiChevronRight className="h-4 w-4 shrink-0 text-neutral-400" />
        ) : (
          <HiChevronDown className="h-4 w-4 shrink-0 text-neutral-400" />
        )}
        {section.title ?? sectionKey}
      </button>

      {!collapsed && (
        <div className="pl-5 pt-2">
          <TimeseriesField
            sectionKey={sectionKey}
            field={pseudoField}
            value={customData?.[sectionKey]}
            onChange={(v) => onSectionChange(sectionKey, v)}
            workspaceMembers={workspaceMembers}
            canEdit={canEdit}
          />
        </div>
      )}
    </div>
  );
}
