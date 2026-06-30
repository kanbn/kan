import type { CustomFieldDef } from "@kan/shared";
import type { WorkspaceMember } from "~/components/Editor";

import { DateField } from "./DateField";
import { KeyValueField } from "./KeyValueField";
import { RichTextField } from "./RichTextField";
import { SectionField } from "./SectionField";
import { SelectField } from "./SelectField";
import { TextField } from "./TextField";
import { TimeseriesField } from "./TimeseriesField";

interface Props {
  fieldKey: string;
  field: CustomFieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
  workspaceMembers: WorkspaceMember[];
  canEdit?: boolean;
  embedded?: boolean;
}

export function FieldRenderer({
  fieldKey,
  field,
  value,
  onChange,
  workspaceMembers,
  canEdit = true,
  embedded = false,
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
          canEdit={canEdit}
        />
      );

    default:
      return null;
  }
}
