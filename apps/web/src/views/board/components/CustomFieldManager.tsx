import { t } from "@lingui/core/macro";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { IoAdd, IoClose, IoCreate, IoSave, IoTrash } from "react-icons/io5";

import Button from "~/components/Button";
import Input from "~/components/Input";
import { FIELD_TYPE_OPTIONS, UI_CONSTANTS, FIELD_VALIDATION } from "~/lib/constants/customFields";
import type { FieldType } from "~/lib/constants/customFields";
import { api } from "~/utils/api";

interface CustomFieldDefinition {
  id: number;
  publicId: string;
  name: string;
  description: string | null;
  type: FieldType;
  isRequired: boolean;
}

interface CustomFieldManagerProps {
  boardPublicId: string;
}



export default function CustomFieldManager({
  boardPublicId,
}: CustomFieldManagerProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [isCreatingField, setIsCreatingField] = useState(false);

  const utils = api.useUtils();

  const fieldDefinitionsQuery =
    api.customField.getFieldDefinitionsByBoard.useQuery({
      boardPublicId,
    });

  const createFieldMutation = api.customField.createFieldDefinition.useMutation(
    {
      onSuccess: () => {
        void utils.customField.getFieldDefinitionsByBoard.invalidate({
          boardPublicId,
        });
        setIsCreatingField(false);
      },
    },
  );

  const updateFieldMutation = api.customField.updateFieldDefinition.useMutation(
    {
      onSuccess: () => {
        void utils.customField.getFieldDefinitionsByBoard.invalidate({
          boardPublicId,
        });
        setEditingField(null);
      },
    },
  );

  const deleteFieldMutation = api.customField.deleteFieldDefinition.useMutation(
    {
      onSuccess: () => {
        void utils.customField.getFieldDefinitionsByBoard.invalidate({
          boardPublicId,
        });
      },
    },
  );

  const handleCreateField = (data: {
    name: string;
    description?: string;
    type: FieldType;
    isRequired: boolean;
  }) => {
    createFieldMutation.mutate({
      ...data,
      boardPublicId,
    });
  };

  const handleDeleteField = (fieldPublicId: string) => {
    if (
      confirm(
        t`Are you sure you want to delete this custom field? This action cannot be undone.`,
      )
    ) {
      deleteFieldMutation.mutate({ fieldDefinitionPublicId: fieldPublicId });
    }
  };

  if (fieldDefinitionsQuery.isLoading) {
    return <div className="p-4">{t`Loading custom fields...`}</div>;
  }

  const fieldDefinitions = fieldDefinitionsQuery.data ?? [];

  return (
    <div className={UI_CONSTANTS.MODAL_CONTAINER}>
      <div className={UI_CONSTANTS.MODAL_HEADER}>
        <div className="flex w-full items-center justify-between pb-4">
          <h2 className={UI_CONSTANTS.MODAL_TITLE}>
            {t`Custom Fields`}
          </h2>
          <Button
            onClick={() => setIsCreatingField(true)}
            size="sm"
            variant="primary"
          >
            <IoAdd className="h-4 w-4" />
            {t`Add Field`}
          </Button>
        </div>
      </div>

      <div className={UI_CONSTANTS.MODAL_BODY}>
        <div className="space-y-2">
          {isCreatingField && (
            <CreateFieldForm
              onSubmit={handleCreateField}
              onCancel={() => setIsCreatingField(false)}
            />
          )}

          {fieldDefinitions.length === 0 && !isCreatingField ? (
            <div className={UI_CONSTANTS.EMPTY_STATE}>
              <p className={UI_CONSTANTS.EMPTY_STATE_TEXT}>
                {t`No custom fields created yet. Add your first custom field to get started.`}
              </p>
            </div>
          ) : (
            fieldDefinitions.map((field) => (
              <FieldDefinitionRow
                key={field.publicId}
                field={field}
                isEditing={editingField === field.publicId}
                onEdit={() => setEditingField(field.publicId)}
                onSave={(data) => {
                  updateFieldMutation.mutate({
                    fieldDefinitionPublicId: field.publicId,
                    ...data,
                  });
                }}
                onCancel={() => setEditingField(null)}
                onDelete={() => handleDeleteField(field.publicId)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

interface FieldDefinitionRowProps {
  field: CustomFieldDefinition;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (data: {
    name?: string;
    description?: string;
    isRequired?: boolean;
  }) => void;
  onCancel: () => void;
  onDelete: () => void;
}

function FieldDefinitionRow({
  field,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}: FieldDefinitionRowProps) {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      name: field.name,
      description: field.description ?? "",
      isRequired: field.isRequired,
    },
  });

  const fieldTypeLabel =
    FIELD_TYPE_OPTIONS.find((option) => option.value === field.type)?.label ??
    field.type;

  if (isEditing) {
    return (
      <form
        onSubmit={handleSubmit(onSave)}
        className={UI_CONSTANTS.FORM_CARD}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-light-900 dark:text-dark-900">
              {t`Field Name`}
            </label>
            <Input {...register("name", { required: true })} />
          </div>

          <div>
            <label className="block text-sm font-medium text-light-900 dark:text-dark-900">
              {t`Description`}
            </label>
            <Input
              {...register("description")}
              placeholder={t`Optional description`}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              {...register("isRequired")}
              type="checkbox"
              className="h-4 w-4"
            />
            <span className="text-sm text-light-900 dark:text-dark-900">
              {t`Required field`}
            </span>
          </div>

          <div className="flex space-x-2">
            <Button type="submit" size="sm" variant="primary">
              <IoSave className="h-4 w-4" />
              {t`Save`}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                reset();
                onCancel();
              }}
            >
              <IoClose className="h-4 w-4" />
              {t`Cancel`}
            </Button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <div className={`group ${UI_CONSTANTS.FORM_CARD}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <h4 className="font-medium text-light-1000 dark:text-dark-1000">
              {field.name}
            </h4>
            <span className="rounded-full bg-light-200 px-2 py-1 text-xs text-light-700 dark:bg-dark-200 dark:text-dark-700">
              {fieldTypeLabel}
            </span>
            {field.isRequired && (
              <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-700 dark:bg-red-900 dark:text-red-300">
                {t`Required`}
              </span>
            )}
          </div>
          {field.description && (
            <p className="mt-1 text-sm text-light-600 dark:text-dark-600">
              {field.description}
            </p>
          )}
        </div>

        <div className="opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex space-x-1">
            <Button size="sm" variant="secondary" onClick={onEdit}>
              <IoCreate className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="danger" onClick={onDelete}>
              <IoTrash className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CreateFieldFormProps {
  onSubmit: (data: {
    name: string;
    description?: string;
    type: FieldType;
    isRequired: boolean;
  }) => void;
  onCancel: () => void;
}

function CreateFieldForm({ onSubmit, onCancel }: CreateFieldFormProps) {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      name: "",
      description: "",
      type: "text" as const,
      isRequired: false,
    },
  });

  const handleFormSubmit = (data: {
    name: string;
    description?: string;
    type: FieldType;
    isRequired: boolean;
  }) => {
    onSubmit(data);
  };

  return (
    <div className={UI_CONSTANTS.FORM_CARD}>
      <div className="mb-4">
        <h4 className="text-lg font-medium text-light-1000 dark:text-dark-1000">{t`Create Custom Field`}</h4>
      </div>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-light-900 dark:text-dark-900">
            {t`Field Name`}
          </label>
          <Input
            {...register("name", { 
              required: true, 
              minLength: FIELD_VALIDATION.name.minLength,
              maxLength: FIELD_VALIDATION.name.maxLength,
            })}
            placeholder={t`Enter field name`}
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-light-900 dark:text-dark-900">
            {t`Field Type`}
          </label>
          <select
            {...register("type", { required: true })}
            className="mt-1 block w-full rounded-md border border-light-300 bg-light-50 px-3 py-2 text-sm dark:border-dark-300 dark:bg-dark-50 dark:text-dark-1000"
          >
            {FIELD_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-light-900 dark:text-dark-900">
            {t`Description`}
          </label>
          <Input
            {...register("description", {
              maxLength: FIELD_VALIDATION.description.maxLength,
            })}
            placeholder={t`Optional description`}
          />
        </div>

        <div className="flex items-center space-x-2">
          <input
            {...register("isRequired")}
            type="checkbox"
            className="h-4 w-4"
          />
          <span className="text-sm text-light-900 dark:text-dark-900">
            {t`Required field`}
          </span>
        </div>

        <div className="flex justify-end space-x-2 border-t border-light-300 pt-4 dark:border-dark-300">
          <Button type="button" variant="secondary" onClick={onCancel}>
            {t`Cancel`}
          </Button>
          <Button type="submit" variant="primary">
            {t`Create Field`}
          </Button>
        </div>
      </form>
    </div>
  );
}
