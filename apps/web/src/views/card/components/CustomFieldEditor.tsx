import { t } from "@lingui/core/macro";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { IoClose, IoSave } from "react-icons/io5";

import Avatar from "~/components/Avatar";
import Button from "~/components/Button";
import Input from "~/components/Input";
import {
  FIELD_PLACEHOLDERS,
  FIELD_VALIDATION,
  INPUT_PLACEHOLDERS,
  UI_CONSTANTS,
} from "~/lib/constants/customFields";
import { api } from "~/utils/api";
import { formatMemberDisplayName, getAvatarUrl } from "~/utils/helpers";
import UserFieldSelector from "./UserFieldSelector";

export interface CustomFieldValue {
  id: number;
  publicId: string;
  fieldDefinition: {
    id: number;
    publicId: string;
    name: string;
    type: "text" | "link" | "date" | "checkbox" | "emoji" | "user";
    isRequired: boolean;
  };
  textValue: string | null;
  linkValue: string | null;
  dateValue: string | null; // Dates come as strings from the database
  checkboxValue: boolean | null;
  emojiValue: string | null;
  userValue: {
    id: number;
    user: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    } | null;
  } | null;
}

interface CustomFieldEditorProps {
  cardPublicId: string;
  fieldValue: CustomFieldValue;
  workspaceMembers: {
    id: number;
    publicId: string;
    email: string;
    user: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    } | null;
  }[];
  onUpdate: () => void;
}

export default function CustomFieldEditor({
  cardPublicId,
  fieldValue,
  workspaceMembers,
  onUpdate,
}: CustomFieldEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const setFieldValueMutation = api.customField.setFieldValue.useMutation({
    onSuccess: () => {
      onUpdate();
      setIsEditing(false);
    },
  });

  const deleteFieldValueMutation = api.customField.deleteFieldValue.useMutation(
    {
      onSuccess: () => {
        onUpdate();
        setIsEditing(false);
      },
    },
  );

  const handleSaveValue = async (value: string | boolean | number | null) => {
    if (value === null || value === "") {
      // Only try to delete if this is not a mock value (mock values have id: -1)
      if (fieldValue.id !== -1) {
        await deleteFieldValueMutation.mutateAsync({
          cardPublicId,
          fieldDefinitionPublicId: fieldValue.fieldDefinition.publicId,
        });
      }
    } else {
      await setFieldValueMutation.mutateAsync({
        cardPublicId,
        fieldDefinitionPublicId: fieldValue.fieldDefinition.publicId,
        value,
      });
    }
  };

  const getCurrentValue = () => {
    switch (fieldValue.fieldDefinition.type) {
      case "text":
        return fieldValue.textValue;
      case "link":
        return fieldValue.linkValue;
      case "date":
        return fieldValue.dateValue;
      case "checkbox":
        return fieldValue.checkboxValue;
      case "emoji":
        return fieldValue.emojiValue;
      case "user":
        return fieldValue.userValue?.id;
      default:
        return null;
    }
  };

  const renderDisplayValue = () => {
    switch (fieldValue.fieldDefinition.type) {
      case "text":
        return fieldValue.textValue ?? FIELD_PLACEHOLDERS.text();
      case "link":
        return fieldValue.linkValue ? (
          <a
            href={fieldValue.linkValue}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            onClick={(e) => e.stopPropagation()}
          >
            {fieldValue.linkValue}
          </a>
        ) : (
          FIELD_PLACEHOLDERS.link()
        );
      case "date":
        return fieldValue.dateValue
          ? new Date(fieldValue.dateValue).toLocaleDateString()
          : FIELD_PLACEHOLDERS.date();
      case "checkbox":
        return fieldValue.checkboxValue === null
          ? FIELD_PLACEHOLDERS.checkbox()
          : fieldValue.checkboxValue
            ? t`Yes`
            : t`No`;
      case "emoji":
        return fieldValue.emojiValue ?? FIELD_PLACEHOLDERS.emoji();
      case "user":
        return fieldValue.userValue?.user ? (
          <div className="flex items-center space-x-2">
            <Avatar
              imageUrl={getAvatarUrl(fieldValue.userValue.user.image)}
              name={fieldValue.userValue.user.name ?? ""}
              email={fieldValue.userValue.user.email}
              size="xs"
            />
            <span>
              {formatMemberDisplayName(
                fieldValue.userValue.user.name ?? "",
                fieldValue.userValue.user.email,
              )}
            </span>
          </div>
        ) : (
          FIELD_PLACEHOLDERS.user()
        );
      default:
        return FIELD_PLACEHOLDERS.default();
    }
  };

  if (isEditing) {
    return (
      <FieldValueEditor
        fieldDefinition={fieldValue.fieldDefinition}
        currentValue={getCurrentValue() ?? null}
        members={workspaceMembers}
        onSave={handleSaveValue}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div
      className={`group ${UI_CONSTANTS.FIELD_INPUT_BASE}`}
      onClick={() => setIsEditing(true)}
    >
      {renderDisplayValue()}
    </div>
  );
}

interface FieldValueEditorProps {
  fieldDefinition: CustomFieldValue["fieldDefinition"];
  currentValue: string | boolean | number | null;
  members: {
    id: number;
    publicId: string;
    email: string;
    user: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    } | null;
  }[];
  onSave: (value: string | boolean | number | null) => void;
  onCancel: () => void;
}

function FieldValueEditor({
  fieldDefinition,
  currentValue,
  members,
  onSave,
  onCancel,
}: FieldValueEditorProps) {
  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: {
      value: currentValue ?? (fieldDefinition.type === "user" ? null : ""),
    },
  });

  const watchedValue = watch("value");

  const onSubmit = (data: { value: string | boolean | number | null }) => {
    onSave(data.value);
  };

  const renderInputField = () => {
    switch (fieldDefinition.type) {
      case "text":
        return (
          <Input
            {...register("value")}
            placeholder={INPUT_PLACEHOLDERS.text()}
            autoFocus
          />
        );

      case "link":
        return (
          <Input
            {...register("value")}
            type="url"
            placeholder={INPUT_PLACEHOLDERS.link()}
            autoFocus
          />
        );

      case "date":
        return <Input {...register("value")} type="date" autoFocus />;

      case "checkbox":
        return (
          <div className="flex items-center space-x-2">
            <input
              {...register("value")}
              type="checkbox"
              className="h-4 w-4"
              defaultChecked={Boolean(currentValue)}
            />
            <span className="text-sm">{fieldDefinition.name}</span>
          </div>
        );

      case "emoji":
        return (
          <Input
            {...register("value")}
            placeholder={INPUT_PLACEHOLDERS.emoji}
            maxLength={FIELD_VALIDATION.emoji.maxLength}
            autoFocus
          />
        );

      case "user":
        return (
          <UserFieldSelector
            members={members}
            selectedUserId={
              typeof watchedValue === "number" ? watchedValue : null
            }
            onSelect={(userId) => {
              setValue("value", userId);
            }}
            placeholder={INPUT_PLACEHOLDERS.user()}
          />
        );

      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      {renderInputField()}
      <div className="flex space-x-2">
        <Button type="submit" size="sm" variant="primary">
          <IoSave className="h-4 w-4" />
          {t`Save`}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={onCancel}>
          <IoClose className="h-4 w-4" />
          {t`Cancel`}
        </Button>
      </div>
    </form>
  );
}
