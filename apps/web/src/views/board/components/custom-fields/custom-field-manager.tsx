import { t } from "@lingui/core/macro";
import { format } from "date-fns";
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
interface DraftOption {
  key: string;
  name: string;
  colourCode: string | null;
}

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
  const [description, setDescription] = useState(definition.description ?? "");
  const [placeholder, setPlaceholder] = useState(definition.placeholder ?? "");
  const [sectionLabel, setSectionLabel] = useState(
    definition.sectionLabel ?? "",
  );
  const [defaultText, setDefaultText] = useState(
    definition.defaultValue?.type === "text" ||
      definition.defaultValue?.type === "number"
      ? definition.defaultValue.value
      : "",
  );
  const [newOptionName, setNewOptionName] = useState("");
  const [isArchiveConfirmationVisible, setIsArchiveConfirmationVisible] =
    useState(false);
  const [optionToArchive, setOptionToArchive] = useState<
    Definition["options"][number] | null
  >(null);

  useEffect(() => setName(definition.name), [definition.name]);
  useEffect(
    () => setDescription(definition.description ?? ""),
    [definition.description],
  );
  useEffect(
    () => setPlaceholder(definition.placeholder ?? ""),
    [definition.placeholder],
  );
  useEffect(
    () => setSectionLabel(definition.sectionLabel ?? ""),
    [definition.sectionLabel],
  );
  useEffect(() => {
    setDefaultText(
      definition.defaultValue?.type === "text" ||
        definition.defaultValue?.type === "number"
        ? definition.defaultValue.value
        : "",
    );
  }, [definition.defaultValue]);

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
  const saveDescription = () => {
    const nextDescription = description.trim() || null;
    if (nextDescription === definition.description) return;
    updateDefinition.mutate({
      fieldPublicId: definition.publicId,
      description: nextDescription,
    });
  };
  const savePlaceholder = () => {
    const nextPlaceholder = placeholder.trim() || null;
    if (nextPlaceholder === definition.placeholder) return;
    updateDefinition.mutate({
      fieldPublicId: definition.publicId,
      placeholder: nextPlaceholder,
    });
  };
  const saveSectionLabel = () => {
    const nextSectionLabel = sectionLabel.trim() || null;
    if (nextSectionLabel === definition.sectionLabel) return;
    updateDefinition.mutate({
      fieldPublicId: definition.publicId,
      sectionLabel: nextSectionLabel,
    });
  };
  const saveDefaultText = () => {
    if (definition.type !== "text" && definition.type !== "number") return;
    const nextDefault =
      definition.type === "number" ? defaultText.trim() : defaultText;
    const previousDefault =
      definition.defaultValue?.type === definition.type
        ? definition.defaultValue.value
        : "";
    if (nextDefault === previousDefault) return;
    updateDefinition.mutate({
      fieldPublicId: definition.publicId,
      defaultValue: nextDefault
        ? { type: definition.type, value: nextDefault }
        : null,
    });
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

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-light-900 dark:text-dark-900">
          {t`Placement`}
          <select
            value={definition.placement}
            disabled={updateDefinition.isPending}
            onChange={(event) =>
              updateDefinition.mutate({
                fieldPublicId: definition.publicId,
                placement: event.target.value as Definition["placement"],
              })
            }
            className="mt-1 block w-full rounded-md border-0 bg-white/5 px-3 py-1.5 text-sm font-normal shadow-sm ring-1 ring-inset ring-light-600 dark:bg-dark-300 dark:text-dark-1000 dark:ring-dark-700"
          >
            <option value="sidebar">{t`Sidebar`}</option>
            <option value="main">{t`Main panel`}</option>
          </select>
        </label>
        <label className="block text-xs font-medium text-light-900 dark:text-dark-900">
          {t`Section`}
          <Input
            className="mt-1"
            value={sectionLabel}
            maxLength={255}
            placeholder={t`No section`}
            disabled={updateDefinition.isPending}
            onChange={(event) => setSectionLabel(event.target.value)}
            onBlur={saveSectionLabel}
          />
        </label>
      </div>

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

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-light-900 dark:text-dark-900 sm:col-span-2">
          {t`Description`}
          <textarea
            rows={2}
            maxLength={2000}
            value={description}
            placeholder={t`Explain how this field should be used`}
            disabled={updateDefinition.isPending}
            onChange={(event) => setDescription(event.target.value)}
            onBlur={saveDescription}
            className="mt-1 block w-full resize-y rounded-md border-0 bg-white/5 px-3 py-1.5 text-sm font-normal shadow-sm ring-1 ring-inset ring-light-600 placeholder:text-light-700 focus:ring-2 focus:ring-inset focus:ring-light-700 dark:bg-dark-300 dark:text-dark-1000 dark:ring-dark-700 dark:placeholder:text-dark-700 dark:focus:ring-dark-700"
          />
        </label>
        {(definition.type === "text" || definition.type === "number") && (
          <label className="block text-xs font-medium text-light-900 dark:text-dark-900">
            {t`Placeholder`}
            <Input
              className="mt-1"
              value={placeholder}
              maxLength={255}
              placeholder={t`Hint shown in an empty field`}
              disabled={updateDefinition.isPending}
              onChange={(event) => setPlaceholder(event.target.value)}
              onBlur={savePlaceholder}
            />
          </label>
        )}
        <label className="block text-xs font-medium text-light-900 dark:text-dark-900">
          {t`Default value`}
          {(definition.type === "text" || definition.type === "number") && (
            <Input
              className="mt-1"
              type="text"
              inputMode={definition.type === "number" ? "decimal" : undefined}
              maxLength={definition.type === "number" ? 100 : 10000}
              value={defaultText}
              placeholder={t`No default`}
              disabled={updateDefinition.isPending}
              onChange={(event) => setDefaultText(event.target.value)}
              onBlur={saveDefaultText}
            />
          )}
          {definition.type === "date" && (
            <Input
              className="mt-1"
              type="datetime-local"
              value={
                definition.defaultValue?.type === "date"
                  ? format(definition.defaultValue.value, "yyyy-MM-dd'T'HH:mm")
                  : ""
              }
              disabled={updateDefinition.isPending}
              onChange={(event) =>
                updateDefinition.mutate({
                  fieldPublicId: definition.publicId,
                  defaultValue: event.target.value
                    ? { type: "date", value: new Date(event.target.value) }
                    : null,
                })
              }
            />
          )}
          {definition.type === "select" && (
            <select
              value={
                definition.defaultValue?.type === "select"
                  ? definition.defaultValue.optionPublicId
                  : ""
              }
              disabled={updateDefinition.isPending}
              onChange={(event) =>
                updateDefinition.mutate({
                  fieldPublicId: definition.publicId,
                  defaultValue: event.target.value
                    ? {
                        type: "select",
                        optionPublicId: event.target.value,
                      }
                    : null,
                })
              }
              className="mt-1 block w-full rounded-md border-0 bg-white/5 px-3 py-1.5 text-sm font-normal shadow-sm ring-1 ring-inset ring-light-600 focus:ring-2 focus:ring-inset focus:ring-light-700 dark:bg-dark-300 dark:text-dark-1000 dark:ring-dark-700 dark:focus:ring-dark-700"
            >
              <option value="">{t`No default`}</option>
              {activeOptions.map((option) => (
                <option key={option.publicId} value={option.publicId}>
                  {option.name}
                </option>
              ))}
            </select>
          )}
          {definition.type === "checkbox" && (
            <div className="mt-2 flex min-h-8 items-center gap-2">
              <input
                type="checkbox"
                checked={
                  definition.defaultValue?.type === "checkbox" &&
                  definition.defaultValue.value
                }
                disabled={updateDefinition.isPending}
                onChange={(event) =>
                  updateDefinition.mutate({
                    fieldPublicId: definition.publicId,
                    defaultValue: {
                      type: "checkbox",
                      value: event.target.checked,
                    },
                  })
                }
                className="h-4 w-4 cursor-pointer appearance-none rounded-md border border-light-500 bg-transparent outline-none ring-0 checked:bg-blue-600 focus:shadow-none focus:ring-0 focus:ring-offset-0 dark:border-dark-500"
              />
              <span className="text-sm font-normal text-light-900 dark:text-dark-900">
                {definition.defaultValue?.type === "checkbox"
                  ? definition.defaultValue.value
                    ? t`Checked`
                    : t`Unchecked`
                  : t`No default`}
              </span>
              {definition.defaultValue?.type === "checkbox" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  disabled={updateDefinition.isPending}
                  onClick={() =>
                    updateDefinition.mutate({
                      fieldPublicId: definition.publicId,
                      defaultValue: null,
                    })
                  }
                >
                  {t`Clear`}
                </Button>
              )}
            </div>
          )}
        </label>
      </div>

      {definition.type === "select" && (
        <div className="mt-4 space-y-2">
          <h3 className="text-xs font-medium text-light-900 dark:text-dark-900">
            {t`Options`}
          </h3>
          {activeOptions.map((option, optionIndex) => (
            <div key={option.publicId} className="space-y-2">
              <div className="flex items-center gap-2">
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
                <div className="min-w-0 flex-1">
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
                </div>
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
                  onClick={() => setOptionToArchive(option)}
                  iconLeft={<HiOutlineTrash className="h-4 w-4" />}
                />
              </div>
              {optionToArchive?.publicId === option.publicId && (
                <div className="rounded-md bg-light-200 p-3 text-sm dark:bg-dark-300">
                  <p className="text-light-1000 dark:text-dark-1000">
                    {t`Archive this option? Existing card values will keep it until changed.`}
                  </p>
                  <div className="mt-3 flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setOptionToArchive(null)}
                    >
                      {t`Cancel`}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      isLoading={archiveOption.isPending}
                      onClick={() =>
                        archiveOption.mutate(
                          { optionPublicId: option.publicId },
                          { onSuccess: () => setOptionToArchive(null) },
                        )
                      }
                    >
                      {t`Archive`}
                    </Button>
                  </div>
                </div>
              )}
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
  const [description, setDescription] = useState("");
  const [placeholder, setPlaceholder] = useState("");
  const [sectionLabel, setSectionLabel] = useState("");
  const [placement, setPlacement] =
    useState<Definition["placement"]>("sidebar");
  const [type, setType] = useState<Definition["type"]>("select");
  const [showOnCard, setShowOnCard] = useState(true);
  const [newOptionName, setNewOptionName] = useState("");
  const [options, setOptions] = useState<DraftOption[]>([]);
  const { data: definitions = [], isLoading } =
    api.customField.definitionsByBoard.useQuery(
      { boardPublicId },
      { enabled: boardPublicId.length === 12 },
    );
  const createDefinition = api.customField.createDefinition.useMutation({
    onSuccess: async () => {
      setName("");
      setDescription("");
      setPlaceholder("");
      setSectionLabel("");
      setPlacement("sidebar");
      setShowOnCard(true);
      setNewOptionName("");
      setOptions([]);
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
  const addOption = () => {
    const optionName = newOptionName.trim();
    if (!optionName) return;
    setOptions((current) => [
      ...current,
      { key: crypto.randomUUID(), name: optionName, colourCode: null },
    ]);
    setNewOptionName("");
  };
  const hasInvalidOption = options.some((option) => !option.name.trim());

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
        className="sticky bottom-0 grid grid-cols-1 gap-2 border-t border-light-400 bg-white/95 p-5 backdrop-blur dark:border-dark-500 dark:bg-dark-100/95 sm:grid-cols-[minmax(0,1fr)_140px_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          const fieldName = name.trim();
          if (!fieldName) return;
          createDefinition.mutate({
            boardPublicId,
            name: fieldName,
            description: description.trim() || null,
            placeholder:
              type === "text" || type === "number"
                ? placeholder.trim() || null
                : null,
            sectionLabel: sectionLabel.trim() || null,
            placement,
            type,
            showOnCard,
            ...(type === "select" && options.length > 0
              ? {
                  options: options.map(({ name: optionName, colourCode }) => ({
                    name: optionName.trim(),
                    colourCode,
                  })),
                }
              : {}),
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
          disabled={!name.trim() || hasInvalidOption}
          isLoading={createDefinition.isPending}
          iconLeft={<HiOutlinePlus className="h-4 w-4" />}
        >
          {t`Add field`}
        </Button>
        <div className="sm:col-span-3">
          <Toggle
            label={t`Show on card front`}
            labelPosition="after"
            isChecked={showOnCard}
            disabled={createDefinition.isPending}
            onChange={() => setShowOnCard((current) => !current)}
          />
        </div>
        <div className="grid gap-2 sm:col-span-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-light-900 dark:text-dark-900">
            {t`Placement`}
            <select
              value={placement}
              disabled={createDefinition.isPending}
              onChange={(event) =>
                setPlacement(event.target.value as Definition["placement"])
              }
              className="mt-1 block w-full rounded-md border-0 bg-white/5 px-3 py-1.5 text-sm font-normal shadow-sm ring-1 ring-inset ring-light-600 dark:bg-dark-300 dark:text-dark-1000 dark:ring-dark-700"
            >
              <option value="sidebar">{t`Sidebar`}</option>
              <option value="main">{t`Main panel`}</option>
            </select>
          </label>
          <label className="block text-xs font-medium text-light-900 dark:text-dark-900">
            {t`Section`}
            <Input
              className="mt-1"
              value={sectionLabel}
              maxLength={255}
              placeholder={t`Section name (optional)`}
              disabled={createDefinition.isPending}
              onChange={(event) => setSectionLabel(event.target.value)}
            />
          </label>
        </div>
        <div
          className={`grid gap-2 sm:col-span-3 ${
            type === "text" || type === "number" ? "sm:grid-cols-2" : ""
          }`}
        >
          <Input
            value={description}
            maxLength={2000}
            placeholder={t`Field description (optional)`}
            disabled={createDefinition.isPending}
            onChange={(event) => setDescription(event.target.value)}
          />
          {(type === "text" || type === "number") && (
            <Input
              value={placeholder}
              maxLength={255}
              placeholder={t`Input placeholder (optional)`}
              disabled={createDefinition.isPending}
              onChange={(event) => setPlaceholder(event.target.value)}
            />
          )}
        </div>
        {type === "select" && (
          <div className="space-y-2 sm:col-span-3">
            <h3 className="text-xs font-medium text-light-900 dark:text-dark-900">
              {t`Options`}
            </h3>
            {options.length > 0 && (
              <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
                {options.map((option, optionIndex) => (
                  <div key={option.key} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={option.colourCode ?? "#64748b"}
                      aria-label={t`Option colour`}
                      className="h-8 w-8 shrink-0 rounded border-0 bg-transparent p-0"
                      disabled={createDefinition.isPending}
                      onChange={(event) =>
                        setOptions((current) =>
                          current.map((item) =>
                            item.key === option.key
                              ? { ...item, colourCode: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <Input
                        value={option.name}
                        maxLength={255}
                        aria-label={t`Option name`}
                        disabled={createDefinition.isPending}
                        onChange={(event) =>
                          setOptions((current) =>
                            current.map((item) =>
                              item.key === option.key
                                ? { ...item, name: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      iconOnly
                      aria-label={t`Move option up`}
                      disabled={optionIndex === 0 || createDefinition.isPending}
                      onClick={() =>
                        setOptions((current) =>
                          moveItem(current, optionIndex, -1),
                        )
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
                        optionIndex === options.length - 1 ||
                        createDefinition.isPending
                      }
                      onClick={() =>
                        setOptions((current) =>
                          moveItem(current, optionIndex, 1),
                        )
                      }
                      iconLeft={<HiChevronDown className="h-4 w-4" />}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      iconOnly
                      aria-label={t`Remove`}
                      disabled={createDefinition.isPending}
                      onClick={() =>
                        setOptions((current) =>
                          current.filter((item) => item.key !== option.key),
                        )
                      }
                      iconLeft={<HiOutlineTrash className="h-4 w-4" />}
                    />
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input
                value={newOptionName}
                maxLength={255}
                placeholder={t`New option`}
                disabled={createDefinition.isPending}
                onChange={(event) => setNewOptionName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addOption();
                  }
                }}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={!newOptionName.trim() || createDefinition.isPending}
                onClick={addOption}
                iconLeft={<HiOutlinePlus className="h-4 w-4" />}
              >
                {t`Add`}
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
