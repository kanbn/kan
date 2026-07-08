import type { CustomFieldDef } from "@kan/shared";
import type { WorkspaceMember } from "~/components/Editor";

import { DateField } from "./DateField";
import { KeyValueField } from "./KeyValueField";
import { RichTextField } from "./RichTextField";
import { SectionField } from "./SectionField";
import { SelectField } from "./SelectField";
import { TextField } from "./TextField";
import { TimeseriesField } from "./TimeseriesField";
import { AddressField } from "./AddressField";

interface Props {
  fieldKey: string;
  field: CustomFieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
  workspaceMembers: WorkspaceMember[];
  canEdit?: boolean;
  embedded?: boolean;
  triggerAddCount?: number;
  boardPublicId: string;
  sectionKey?: string;
  isSidebar?: boolean;
}

export function FieldRenderer({
  fieldKey,
  field,
  value,
  onChange,
  workspaceMembers,
  canEdit = true,
  embedded = false,
  triggerAddCount = 0,
  boardPublicId,
  sectionKey,
  isSidebar = false,
}: Props) {
  switch (field.type) {
    case "text":
    case "textarea":
    case "number":
    case "tel":
      return (
        <TextField
          fieldKey={fieldKey}
          field={field}
          value={value}
          onChange={(v) => onChange(v)}
          canEdit={canEdit}
          embedded={embedded}
          boardPublicId={boardPublicId}
          sectionKey={sectionKey}
          isSidebar={isSidebar}
        />
      );

    case "richtext":
      return (
        <RichTextField
          fieldKey={fieldKey}
          field={field}
          value={value}
          onChange={(v) => onChange(v)}
          workspaceMembers={workspaceMembers}
          canEdit={canEdit}
          embedded={embedded}
          isSidebar={isSidebar}
        />
      );

    case "date":
    case "datetime-local":
      return (
        <DateField
          fieldKey={fieldKey}
          field={field}
          value={value}
          onChange={(v) => onChange(v)}
          canEdit={canEdit}
          embedded={embedded}
          isSidebar={isSidebar}
        />
      );

    case "select":
      return (
        <SelectField
          fieldKey={fieldKey}
          field={field}
          value={value}
          onChange={(v) => onChange(v)}
          canEdit={canEdit}
          embedded={embedded}
          boardPublicId={boardPublicId}
          sectionKey={sectionKey}
          isSidebar={isSidebar}
        />
      );

    case "address":
      return (
        <AddressField
          fieldKey={fieldKey}
          field={field}
          value={value as any}
          onChange={onChange}
          canEdit={canEdit}
          isSidebar={isSidebar}
          embedded={embedded}
          triggerAddCount={triggerAddCount}
        />
      );

    case "section":
      return (
        <SectionField
          sectionKey={fieldKey}
          field={field}
          value={value}
          onChange={onChange}
          workspaceMembers={workspaceMembers}
          canEdit={canEdit}
          triggerAddCount={triggerAddCount}
          boardPublicId={boardPublicId}
        />
      );

    case "list":
      return (
        <SectionField
          sectionKey={fieldKey}
          field={field}
          value={value}
          onChange={onChange}
          workspaceMembers={workspaceMembers}
          canEdit={canEdit}
          isList
          triggerAddCount={triggerAddCount}
          boardPublicId={boardPublicId}
        />
      );

    case "timeseries":
      return (
        <TimeseriesField
          sectionKey={fieldKey}
          field={field}
          value={value}
          onChange={onChange}
          workspaceMembers={workspaceMembers}
          canEdit={canEdit}
          triggerAddCount={triggerAddCount}
          boardPublicId={boardPublicId}
        />
      );

    case "keyvalue":
      return (
        <KeyValueField
          fieldKey={fieldKey}
          field={field}
          value={value}
          onChange={onChange}
          workspaceMembers={workspaceMembers}
          canEdit={canEdit}          triggerAddCount={triggerAddCount}        />
      );

    default:
      return null;
  }
}
