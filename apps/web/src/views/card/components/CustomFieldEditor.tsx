import { t } from "@lingui/core/macro";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import Avatar from "~/components/Avatar";
import Input from "~/components/Input";
import { useDebounce } from "~/hooks/useDebounce";
import {
  FIELD_PLACEHOLDERS,
  INPUT_PLACEHOLDERS,
  UI_CONSTANTS,
} from "~/lib/constants/customFields";
import { api } from "~/utils/api";
import { formatMemberDisplayName, getAvatarUrl } from "~/utils/helpers";
import { EmojiPicker } from "./EmojiPicker";
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
  const editingContainerRef = useRef<HTMLDivElement>(null);

  // Handle click outside to exit editing mode
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isEditing &&
        editingContainerRef.current &&
        !editingContainerRef.current.contains(event.target as Node)
      ) {
        setIsEditing(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (isEditing && event.key === "Escape") {
        setIsEditing(false);
      }
    };

    if (isEditing) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscapeKey);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isEditing]);

  const setFieldValueMutation = api.customField.setFieldValue.useMutation({
    onSuccess: () => {
      onUpdate();
    },
  });

  const deleteFieldValueMutation = api.customField.deleteFieldValue.useMutation(
    {
      onSuccess: () => {
        onUpdate();
      },
    },
  );

  const handleSaveValue = async (value: string | boolean | number | null) => {
    try {
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
      // Don't auto-exit editing mode - let user control when to exit
    } catch (error) {
      // Keep editing mode if save fails
      console.error("Failed to save field value:", error);
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
      <div ref={editingContainerRef}>
        <FieldValueEditor
          fieldDefinition={fieldValue.fieldDefinition}
          currentValue={getCurrentValue() ?? null}
          members={workspaceMembers}
          onSave={handleSaveValue}
        />
      </div>
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
}

function FieldValueEditor({
  fieldDefinition,
  currentValue,
  members,
  onSave,
}: FieldValueEditorProps) {
  const { register, setValue, watch } = useForm({
    defaultValues: {
      value: currentValue ?? (fieldDefinition.type === "user" ? null : ""),
    },
  });

  const watchedValue = watch("value");
  const [debouncedValue] = useDebounce(watchedValue, 500);
  const [isMounted, setIsMounted] = useState(false);
  const lastSavedValue = useRef(currentValue);
  const onSaveRef = useRef(onSave);

  // Keep onSave reference up to date
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  // Mark as mounted after hydration
  useEffect(() => {
    setIsMounted(true);
    lastSavedValue.current = currentValue;
  }, [currentValue]);

  // Auto-save when debounced value changes and differs from current value
  useEffect(() => {
    // Skip during SSR and initial hydration
    if (!isMounted) {
      return;
    }

    // Only save if the value actually changed and is different from last saved value
    if (
      debouncedValue !== currentValue &&
      debouncedValue !== lastSavedValue.current
    ) {
      lastSavedValue.current = debouncedValue;
      onSaveRef.current(debouncedValue);
    }
  }, [debouncedValue, currentValue, isMounted]);

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
          <div className="flex items-center justify-between rounded-[5px] border-[1px] border-light-50 px-3 py-2 dark:border-dark-50">
            <input
              {...register("value")}
              type="checkbox"
              className="h-4 w-4 rounded border-light-300 bg-light-50 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-dark-300 dark:bg-dark-50 dark:focus:ring-blue-600"
              defaultChecked={Boolean(currentValue)}
            />
          </div>
        );

      case "emoji":
        return (
          <EmojiPicker
            value={(watchedValue as string) || ""}
            onChange={(emoji) => setValue("value", emoji)}
            placeholder={INPUT_PLACEHOLDERS.emoji}
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

  return <div className="space-y-3">{renderInputField()}</div>;
}
