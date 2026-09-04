import { t } from "@lingui/core/macro";
import { useEffect, useState } from "react";
import {
  HiChevronDown,
  HiChevronUp,
  HiOutlinePlus,
  HiOutlineTrash,
  HiXMark,
} from "react-icons/hi2";

import type { RouterOutputs } from "~/utils/api";
import Button from "~/components/Button";
import Input from "~/components/Input";
import Toggle from "~/components/Toggle";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

type Definition = RouterOutputs["customField"]["definitionsByBoard"][number];

const fieldTypes: Definition["type"][] = [
  "text",
  "number",
  "date",
  "checkbox",
  "select",
];

const getFieldTypeLabel = (type: Definition["type"]) => {
  switch (type) {
    case "text":
      return t`Text`;
    case "number":
      return t`Number`;
    case "date":
      return t`Date`;
    case "checkbox":
      return t`Checkbox`;
    case "select":
      return t`Dropdown`;
  }
};

const moveItem = <T,>(items: T[], index: number, offset: number) => {
  const targetIndex = index + offset;
  if (targetIndex < 0 || targetIndex >= items.length) return items;
  const result = [...items];
  const [item] = result.splice(index, 1);
  if (item !== undefined) result.splice(targetIndex, 0, item);
  return result;
};

function FieldRow({
  boardPublicId,
  definition,
  definitions,
}: {
  boardPublicId: string;
  definition: Definition;
  definitions: Definition[];
}) {
  const utils = api.useUtils();
  const { showPopup } = usePopup();
  const [name, setName] = useState(definition.name);
  const [newOptionName, setNewOptionName] = useState("");
  const [isArchiveConfirmationVisible, setIsArchiveConfirmationVisible] =
    useState(false);

  useEffect(() => setName(definition.name), [definition.name]);

  const invalidate = async () => {
    await Promise.all([
      utils.customField.definitionsByBoard.invalidate({ boardPublicId }),
      utils.board.byId.invalidate({ boardPublicId }),
      utils.card.byId.invalidate(),
    ]);
  };
  const mutationOptions = {
    onError: () =>
      showPopup({
        header: t`Unable to update custom fields`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error" as const,
      }),
    onSettled: invalidate,
  };
  const updateDefinition =
    api.customField.updateDefinition.useMutation(mutationOptions);
  const archiveDefinition =
    api.customField.archiveDefinition.useMutation(mutationOptions);
  const reorderDefinitions =
    api.customField.reorderDefinitions.useMutation(mutationOptions);
  const createOption = api.customField.createOption.useMutation({
    ...mutationOptions,
    onSuccess: () => setNewOptionName(""),
  });
  const updateOption =
    api.customField.updateOption.useMutation(mutationOptions);
  const archiveOption =
    api.customField.archiveOption.useMutation(mutationOptions);
  const reorderOptions =
    api.customField.reorderOptions.useMutation(mutationOptions);

  const fieldIndex = definitions.findIndex(
    (field) => field.publicId === definition.publicId,
  );
  const activeOptions = definition.options.filter(
    (option) => !option.isArchived,
  );
  const archivedOptions = definition.options.filter(
    (option) => option.isArchived,
  );

  const saveName = () => {
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName === definition.name) return;
    updateDefinition.mutate(
      {
        fieldPublicId: definition.publicId,
        name: trimmedName,
      },
      { onError: () => setName(definition.name) },
    );
  };

  return (
    <section className="rounded-md border border-light-400 p-4 dark:border-dark-500">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <Input
            aria-label={t`Custom field name`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={saveName}
            onKeyDown={(event) => {
              if (event.key === "Enter")
                (event.currentTarget as HTMLInputElement).blur();
            }}
          />
          <p className="mt-1 text-xs text-light-800 dark:text-dark-800">
            {getFieldTypeLabel(definition.type)}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          iconOnly
          aria-label={t`Move field up`}
          disabled={fieldIndex <= 0 || reorderDefinitions.isPending}
          onClick={() =>
            reorderDefinitions.mutate({
              boardPublicId,
              fieldPublicIds: moveItem(definitions, fieldIndex, -1).map(
                (field) => field.publicId,
              ),
            })
          }
          iconLeft={<HiChevronUp className="h-4 w-4" />}
        />
        <Button
          type="button"
          variant="ghost"
          size="xs"
          iconOnly
          aria-label={t`Move field down`}
          disabled={
            fieldIndex === definitions.length - 1 ||
            reorderDefinitions.isPending
          }
          onClick={() =>
            reorderDefinitions.mutate({
              boardPublicId,
              fieldPublicIds: moveItem(definitions, fieldIndex, 1).map(
                (field) => field.publicId,
              ),
            })
          }
          iconLeft={<HiChevronDown className="h-4 w-4" />}
        />
        <Button
          type="button"
          variant="ghost"
          size="xs"
          iconOnly
          aria-label={t`Archive custom field`}
          disabled={archiveDefinition.isPending}
          onClick={() => setIsArchiveConfirmationVisible(true)}
          iconLeft={<HiOutlineTrash className="h-4 w-4" />}
        />
      </div>

      {isArchiveConfirmationVisible && (
        <div className="mt-3 rounded-md bg-light-200 p-3 text-sm dark:bg-dark-300">
          <p className="text-light-1000 dark:text-dark-1000">
            {t`Archive this field? Existing card values will be hidden but preserved.`}
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsArchiveConfirmationVisible(false)}
            >
              {t`Cancel`}
            </Button>
            <Button
              type="button"
              size="sm"
              isLoading={archiveDefinition.isPending}
              onClick={() =>
                archiveDefinition.mutate(
                  { fieldPublicId: definition.publicId },
                  {
                    onSuccess: () => setIsArchiveConfirmationVisible(false),
                  },
                )
              }
            >
              {t`Archive`}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-3">
        <Toggle
          label={t`Show on card front`}
          labelPosition="after"
          isChecked={definition.showOnCard}
          disabled={updateDefinition.isPending}
          onChange={() =>
            updateDefinition.mutate({
              fieldPublicId: definition.publicId,
              showOnCard: !definition.showOnCard,
            })
          }
        />
      </div>

      {definition.type === "select" && (
        <div className="mt-4 space-y-2">
          <h3 className="text-xs font-medium text-light-900 dark:text-dark-900">
            {t`Options`}
          </h3>
          {activeOptions.map((option, optionIndex) => (
            <div key={option.publicId} className="flex items-center gap-2">
              <input
                type="color"
                value={option.colourCode ?? "#64748b"}
                aria-label={t`Option colour`}
                className="h-8 w-8 rounded border-0 bg-transparent p-0"
                onChange={(event) =>
                  updateOption.mutate({
                    optionPublicId: option.publicId,
                    colourCode: event.target.value,
                  })
                }
              />
              <Input
                defaultValue={option.name}
                aria-label={t`Option name`}
                onBlur={(event) => {
                  const input = event.currentTarget;
                  const optionName = input.value.trim();
                  if (!optionName) {
                    input.value = option.name;
                    return;
                  }
                  if (optionName !== option.name)
                    updateOption.mutate(
                      {
                        optionPublicId: option.publicId,
                        name: optionName,
                      },
                      {
                        onError: () => {
                          input.value = option.name;
                        },
                      },
                    );
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="xs"
                iconOnly
                aria-label={t`Move option up`}
                disabled={optionIndex === 0 || reorderOptions.isPending}
                onClick={() =>
                  reorderOptions.mutate({
                    fieldPublicId: definition.publicId,
                    optionPublicIds: moveItem(
                      activeOptions,
                      optionIndex,
                      -1,
                    ).map((item) => item.publicId),
                  })
                }
                iconLeft={<HiChevronUp className="h-4 w-4" />}
              />
              <Button
                type="button"
                variant="ghost"
                size="xs"
                iconOnly
                aria-label={t`Move option down`}
                disabled={
                  optionIndex === activeOptions.length - 1 ||
                  reorderOptions.isPending
                }
                onClick={() =>
                  reorderOptions.mutate({
                    fieldPublicId: definition.publicId,
                    optionPublicIds: moveItem(
                      activeOptions,
                      optionIndex,
                      1,
                    ).map((item) => item.publicId),
                  })
                }
                iconLeft={<HiChevronDown className="h-4 w-4" />}
              />
              <Button
                type="button"
                variant="ghost"
                size="xs"
                iconOnly
                aria-label={t`Archive option`}
                disabled={archiveOption.isPending}
                onClick={() =>
                  archiveOption.mutate({ optionPublicId: option.publicId })
                }
                iconLeft={<HiOutlineTrash className="h-4 w-4" />}
              />
            </div>
          ))}
          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const optionName = newOptionName.trim();
              if (!optionName) return;
              createOption.mutate({
                fieldPublicId: definition.publicId,
                name: optionName,
                colourCode: null,
              });
            }}
          >
            <Input
              value={newOptionName}
              placeholder={t`New option`}
              onChange={(event) => setNewOptionName(event.target.value)}
            />
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              disabled={!newOptionName.trim()}
              isLoading={createOption.isPending}
              iconLeft={<HiOutlinePlus className="h-4 w-4" />}
            >
              {t`Add`}
            </Button>
          </form>
          {archivedOptions.length > 0 && (
            <div className="pt-2 text-xs text-light-700 dark:text-dark-700">
              {t`Archived options`}:{" "}
              {archivedOptions.map(({ name }) => name).join(", ")}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export function CustomFieldManager({
  boardPublicId,
}: {
  boardPublicId: string;
}) {
  const { closeModal } = useModal();
  const { showPopup } = usePopup();
  const utils = api.useUtils();
  const [name, setName] = useState("");
  const [type, setType] = useState<Definition["type"]>("select");
  const { data: definitions = [], isLoading } =
    api.customField.definitionsByBoard.useQuery(
      { boardPublicId },
      { enabled: boardPublicId.length === 12 },
    );
  const createDefinition = api.customField.createDefinition.useMutation({
    onSuccess: async () => {
      setName("");
      await Promise.all([
        utils.customField.definitionsByBoard.invalidate({ boardPublicId }),
        utils.board.byId.invalidate({ boardPublicId }),
      ]);
    },
    onError: () =>
      showPopup({
        header: t`Unable to create custom field`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      }),
  });

  return (
    <div className="max-h-[80vh] overflow-y-auto">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-light-400 bg-white/95 px-5 py-4 backdrop-blur dark:border-dark-500 dark:bg-dark-100/95">
        <div>
          <h2 className="text-sm font-medium text-neutral-900 dark:text-dark-1000">
            {t`Custom fields`}
          </h2>
          <p className="mt-1 text-xs text-light-800 dark:text-dark-800">
            {t`Fields are available as soon as you create the first one.`}
          </p>
        </div>
        <button
          type="button"
          className="rounded p-1 hover:bg-light-300 dark:hover:bg-dark-300"
          aria-label={t`Close`}
          onClick={closeModal}
        >
          <HiXMark className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-3 p-5">
        {isLoading ? (
          <div className="h-24 animate-pulse rounded-md bg-light-200 dark:bg-dark-300" />
        ) : definitions.length > 0 ? (
          definitions.map((definition) => (
            <FieldRow
              key={definition.publicId}
              boardPublicId={boardPublicId}
              definition={definition}
              definitions={definitions}
            />
          ))
        ) : (
          <p className="rounded-md border border-dashed border-light-500 p-5 text-center text-sm text-light-800 dark:border-dark-500 dark:text-dark-800">
            {t`This board has no custom fields yet.`}
          </p>
        )}
      </div>

      <form
        className="sticky bottom-0 grid grid-cols-[1fr_140px_auto] gap-2 border-t border-light-400 bg-white/95 p-5 backdrop-blur dark:border-dark-500 dark:bg-dark-100/95"
        onSubmit={(event) => {
          event.preventDefault();
          const fieldName = name.trim();
          if (!fieldName) return;
          createDefinition.mutate({
            boardPublicId,
            name: fieldName,
            type,
            showOnCard: true,
          });
        }}
      >
        <Input
          value={name}
          placeholder={t`Field name`}
          onChange={(event) => setName(event.target.value)}
        />
        <select
          value={type}
          onChange={(event) =>
            setType(event.target.value as Definition["type"])
          }
          aria-label={t`Field type`}
          className="rounded-md border-0 bg-white/5 px-3 py-1.5 text-sm shadow-sm ring-1 ring-inset ring-light-600 dark:bg-dark-300 dark:text-dark-1000 dark:ring-dark-700"
        >
          {fieldTypes.map((fieldType) => (
            <option key={fieldType} value={fieldType}>
              {getFieldTypeLabel(fieldType)}
            </option>
          ))}
        </select>
        <Button
          type="submit"
          disabled={!name.trim()}
          isLoading={createDefinition.isPending}
          iconLeft={<HiOutlinePlus className="h-4 w-4" />}
        >
          {t`Add field`}
        </Button>
      </form>
    </div>
  );
}
