import { t } from "@lingui/core/macro";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import {
  HiChevronDown,
  HiChevronRight,
  HiChevronUp,
  HiOutlinePlus,
  HiOutlineTrash,
  HiXMark,
} from "react-icons/hi2";

import type { RouterInputs, RouterOutputs } from "~/utils/api";
import Button from "~/components/Button";
import Input from "~/components/Input";
import Toggle from "~/components/Toggle";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";
import { isValidCustomFieldNumberValue } from "../../../custom-fields/custom-field-number";
import { CustomFieldColourPicker } from "./custom-field-colour-picker";

type Definition = RouterOutputs["customField"]["definitionsByBoard"][number];
type DefinitionDraft = RouterInputs["customField"]["saveDefinition"];

interface DraftOption {
  key: string;
  publicId?: string;
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
      return t`Choice`;
  }
};

const getFieldTypeDescription = (type: Definition["type"]) => {
  switch (type) {
    case "text":
      return t`Any text, including numbers.`;
    case "number":
      return t`Enter a single number.`;
    case "date":
      return t`A date and optional time.`;
    case "checkbox":
      return t`A simple checked or unchecked flag.`;
    case "select":
      return t`Choose one option from a list.`;
  }
};

const getPlacementLabel = (placement: Definition["placement"]) =>
  placement === "main" ? t`Main panel` : t`Sidebar`;

function AdvancedSettings({
  isExpanded,
  onToggle,
  children,
}: {
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-light-400 dark:border-dark-500">
      <button
        type="button"
        aria-expanded={isExpanded}
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-medium text-light-900 hover:bg-light-200 dark:text-dark-900 dark:hover:bg-dark-300"
        onClick={onToggle}
      >
        {isExpanded ? (
          <HiChevronDown className="h-4 w-4" />
        ) : (
          <HiChevronRight className="h-4 w-4" />
        )}
        {t`Advanced settings`}
      </button>
      {isExpanded && (
        <div className="space-y-3 border-t border-light-400 p-3 dark:border-dark-500">
          {children}
        </div>
      )}
    </div>
  );
}

const moveItem = <T,>(items: T[], index: number, offset: number) => {
  const targetIndex = index + offset;
  if (targetIndex < 0 || targetIndex >= items.length) return items;
  const result = [...items];
  const [item] = result.splice(index, 1);
  if (item !== undefined) result.splice(targetIndex, 0, item);
  return result;
};

const getDraftOptions = (definition: Definition): DraftOption[] =>
  definition.options
    .filter((option) => !option.isArchived)
    .map((option) => ({
      key: option.publicId,
      publicId: option.publicId,
      name: option.name,
      colourCode: option.colourCode,
    }));

function OptionRow({
  option,
  index,
  optionCount,
  disabled,
  onChange,
  onMove,
  onRemove,
}: {
  option: DraftOption;
  index: number;
  optionCount: number;
  disabled: boolean;
  onChange: (option: DraftOption) => void;
  onMove: (offset: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
      <CustomFieldColourPicker
        value={option.colourCode}
        disabled={disabled}
        onChange={(colourCode) => onChange({ ...option, colourCode })}
      />
      <div className="min-w-48 flex-1">
        <Input
          value={option.name}
          maxLength={255}
          aria-label={t`Option name`}
          disabled={disabled}
          onChange={(event) =>
            onChange({ ...option, name: event.target.value })
          }
        />
      </div>
      <div className="ml-auto flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="xs"
          iconOnly
          aria-label={t`Move option up`}
          disabled={index === 0 || disabled}
          onClick={() => onMove(-1)}
          iconLeft={<HiChevronUp className="h-4 w-4" />}
        />
        <Button
          type="button"
          variant="ghost"
          size="xs"
          iconOnly
          aria-label={t`Move option down`}
          disabled={index === optionCount - 1 || disabled}
          onClick={() => onMove(1)}
          iconLeft={<HiChevronDown className="h-4 w-4" />}
        />
        <Button
          type="button"
          variant="ghost"
          size="xs"
          iconOnly
          aria-label={t`Remove option`}
          disabled={disabled}
          onClick={onRemove}
          iconLeft={<HiOutlineTrash className="h-4 w-4" />}
        />
      </div>
    </div>
  );
}

function OptionDrafts({
  options,
  setOptions,
  disabled,
  onRemove,
}: {
  options: DraftOption[];
  setOptions: React.Dispatch<React.SetStateAction<DraftOption[]>>;
  disabled: boolean;
  onRemove?: (option: DraftOption) => void;
}) {
  const [newOptionName, setNewOptionName] = useState("");
  const addOption = () => {
    const name = newOptionName.trim();
    if (!name) return;
    setOptions((current) => [
      ...current,
      { key: `new:${crypto.randomUUID()}`, name, colourCode: null },
    ]);
    setNewOptionName("");
  };

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-light-900 dark:text-dark-900">{t`Options`}</h3>
      {options.map((option, index) => (
        <OptionRow
          key={option.key}
          option={option}
          index={index}
          optionCount={options.length}
          disabled={disabled}
          onChange={(nextOption) =>
            setOptions((current) =>
              current.map((item) =>
                item.key === nextOption.key ? nextOption : item,
              ),
            )
          }
          onMove={(offset) =>
            setOptions((current) => moveItem(current, index, offset))
          }
          onRemove={() => {
            setOptions((current) =>
              current.filter((item) => item.key !== option.key),
            );
            onRemove?.(option);
          }}
        />
      ))}
      <div className="flex items-center gap-2">
        <Input
          value={newOptionName}
          maxLength={255}
          placeholder={t`New option`}
          disabled={disabled}
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
          disabled={!newOptionName.trim() || disabled}
          onClick={addOption}
          iconLeft={<HiOutlinePlus className="h-4 w-4" />}
        >
          {t`Add`}
        </Button>
      </div>
    </div>
  );
}

function FieldRow({
  boardPublicId,
  definition,
  definitions,
  isExpanded,
  onToggle,
  onSaved,
}: {
  boardPublicId: string;
  definition: Definition;
  definitions: Definition[];
  isExpanded: boolean;
  onToggle: () => void;
  onSaved: () => void;
}) {
  const utils = api.useUtils();
  const { showPopup } = usePopup();
  const [name, setName] = useState(definition.name);
  const [description, setDescription] = useState(definition.description ?? "");
  const [placeholder, setPlaceholder] = useState(definition.placeholder ?? "");
  const [sectionLabel, setSectionLabel] = useState(
    definition.sectionLabel ?? "",
  );
  const [placement, setPlacement] = useState(definition.placement);
  const [showOnCard, setShowOnCard] = useState(definition.showOnCard);
  const [defaultText, setDefaultText] = useState("");
  const [defaultDate, setDefaultDate] = useState("");
  const [defaultCheckbox, setDefaultCheckbox] = useState<"" | "true">("");
  const [defaultOptionKey, setDefaultOptionKey] = useState("");
  const [options, setOptions] = useState(() => getDraftOptions(definition));
  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState(
    !!definition.sectionLabel || !!definition.placeholder,
  );
  const [isDeleteConfirmationVisible, setIsDeleteConfirmationVisible] =
    useState(false);

  const resetDraft = () => {
    setName(definition.name);
    setDescription(definition.description ?? "");
    setPlaceholder(definition.placeholder ?? "");
    setSectionLabel(definition.sectionLabel ?? "");
    setPlacement(definition.placement);
    setShowOnCard(definition.showOnCard);
    setDefaultText(
      definition.defaultValue?.type === "text" ||
        definition.defaultValue?.type === "number"
        ? definition.defaultValue.value
        : "",
    );
    setDefaultDate(
      definition.defaultValue?.type === "date"
        ? format(definition.defaultValue.value, "yyyy-MM-dd'T'HH:mm")
        : "",
    );
    setDefaultCheckbox(
      definition.defaultValue?.type === "checkbox"
        ? definition.defaultValue.value
          ? "true"
          : ""
        : "",
    );
    setDefaultOptionKey(
      definition.defaultValue?.type === "select"
        ? definition.defaultValue.optionPublicId
        : "",
    );
    setOptions(getDraftOptions(definition));
    setIsAdvancedExpanded(
      !!definition.sectionLabel || !!definition.placeholder,
    );
  };

  useEffect(resetDraft, [definition]);

  const invalidate = async () => {
    await Promise.all([
      utils.customField.definitionsByBoard.invalidate({ boardPublicId }),
      utils.board.byId.invalidate({ boardPublicId }),
      utils.card.byId.invalidate(),
    ]);
  };
  const saveDefinition = api.customField.saveDefinition.useMutation({
    onSuccess: async () => {
      await invalidate();
      onSaved();
    },
    onError: () =>
      showPopup({
        header: t`Unable to update custom fields`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      }),
  });
  const deleteDefinition = api.customField.deleteDefinition.useMutation({
    onSuccess: invalidate,
    onError: () =>
      showPopup({
        header: t`Unable to update custom fields`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      }),
  });
  const reorderDefinitions = api.customField.reorderDefinitions.useMutation({
    onSettled: invalidate,
    onError: () =>
      showPopup({
        header: t`Unable to update custom fields`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      }),
  });
  const fieldIndex = definitions.findIndex(
    (field) => field.publicId === definition.publicId,
  );
  const archivedOptions = definition.options.filter(
    (option) => option.isArchived,
  );
  const hasInvalidOption = options.some((option) => !option.name.trim());
  const hasInvalidNumberDefault =
    definition.type === "number" &&
    !!defaultText.trim() &&
    !isValidCustomFieldNumberValue(defaultText);

  const getDefaultValue = (): DefinitionDraft["defaultValue"] => {
    switch (definition.type) {
      case "text":
        return defaultText ? { type: "text", value: defaultText } : null;
      case "number": {
        const value = defaultText.trim();
        return value ? { type: "number", value } : null;
      }
      case "date":
        return defaultDate
          ? { type: "date", value: new Date(defaultDate) }
          : null;
      case "checkbox":
        return defaultCheckbox ? { type: "checkbox", value: true } : null;
      case "select":
        return defaultOptionKey
          ? { type: "select", optionKey: defaultOptionKey }
          : null;
    }
  };

  return (
    <section
      className={`rounded-md border border-light-400 dark:border-dark-500 ${
        isExpanded ? "bg-light-100 dark:bg-dark-200" : ""
      }`}
    >
      <div className="flex items-center gap-1 p-2">
        <button
          type="button"
          aria-expanded={isExpanded}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-light-200 dark:hover:bg-dark-300"
          onClick={onToggle}
        >
          {isExpanded ? (
            <HiChevronDown className="h-4 w-4 shrink-0" />
          ) : (
            <HiChevronRight className="h-4 w-4 shrink-0" />
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-neutral-900 dark:text-dark-1000">
              {definition.name}
            </span>
            <span className="block truncate text-xs text-light-700 dark:text-dark-700">
              {getFieldTypeLabel(definition.type)} ·{" "}
              {getPlacementLabel(definition.placement)}
              {definition.showOnCard ? ` · ${t`Shown on card front`}` : ""}
            </span>
          </span>
        </button>
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
      </div>

      {isExpanded && (
        <form
          className="space-y-4 border-t border-light-400 p-4 dark:border-dark-500"
          onSubmit={(event) => {
            event.preventDefault();
            const fieldName = name.trim();
            if (!fieldName || hasInvalidOption || hasInvalidNumberDefault)
              return;
            saveDefinition.mutate({
              fieldPublicId: definition.publicId,
              name: fieldName,
              description: description.trim() || null,
              placeholder:
                definition.type === "text" || definition.type === "number"
                  ? placeholder.trim() || null
                  : null,
              sectionLabel: sectionLabel.trim() || null,
              placement,
              showOnCard,
              defaultValue: getDefaultValue(),
              options:
                definition.type === "select"
                  ? options.map((option) => ({
                      key: option.key,
                      ...(option.publicId ? { publicId: option.publicId } : {}),
                      name: option.name.trim(),
                      colourCode: option.colourCode,
                    }))
                  : [],
            });
          }}
        >
          <label className="block text-xs font-medium text-light-900 dark:text-dark-900">
            {t`Field name`}
            <Input
              className="mt-1"
              value={name}
              maxLength={255}
              disabled={saveDefinition.isPending}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="block text-xs font-medium text-light-900 dark:text-dark-900">
            {t`Placement`}
            <select
              value={placement}
              disabled={saveDefinition.isPending}
              onChange={(event) =>
                setPlacement(event.target.value as Definition["placement"])
              }
              className="mt-1 block w-full rounded-md border-0 bg-white/5 px-3 py-1.5 text-sm font-normal shadow-sm ring-1 ring-inset ring-light-600 dark:bg-dark-300 dark:text-dark-1000 dark:ring-dark-700"
            >
              <option value="sidebar">{t`Sidebar`}</option>
              <option value="main">{t`Main panel`}</option>
            </select>
          </label>
          <Toggle
            label={t`Show on card front`}
            labelPosition="after"
            isChecked={showOnCard}
            disabled={saveDefinition.isPending}
            onChange={() => setShowOnCard((current) => !current)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-light-900 dark:text-dark-900 sm:col-span-2">
              {t`Description`}
              <textarea
                rows={2}
                maxLength={2000}
                value={description}
                placeholder={t`Explain how this field should be used`}
                disabled={saveDefinition.isPending}
                onChange={(event) => setDescription(event.target.value)}
                className="mt-1 block w-full resize-y rounded-md border-0 bg-white/5 px-3 py-1.5 text-sm font-normal shadow-sm ring-1 ring-inset ring-light-600 placeholder:text-light-700 focus:ring-2 focus:ring-inset focus:ring-light-700 dark:bg-dark-300 dark:text-dark-1000 dark:ring-dark-700 dark:placeholder:text-dark-700 dark:focus:ring-dark-700"
              />
            </label>
            <label className="block text-xs font-medium text-light-900 dark:text-dark-900">
              {t`Default value`}
              {(definition.type === "text" || definition.type === "number") && (
                <Input
                  className="mt-1"
                  type="text"
                  inputMode={
                    definition.type === "number" ? "decimal" : undefined
                  }
                  maxLength={definition.type === "number" ? 100 : 10000}
                  value={defaultText}
                  placeholder={t`No default`}
                  errorMessage={
                    hasInvalidNumberDefault
                      ? t`Enter a valid number.`
                      : undefined
                  }
                  aria-invalid={hasInvalidNumberDefault}
                  disabled={saveDefinition.isPending}
                  onChange={(event) => setDefaultText(event.target.value)}
                />
              )}
              {definition.type === "date" && (
                <Input
                  className="mt-1"
                  type="datetime-local"
                  value={defaultDate}
                  disabled={saveDefinition.isPending}
                  onChange={(event) => setDefaultDate(event.target.value)}
                />
              )}
              {definition.type === "select" && (
                <select
                  value={defaultOptionKey}
                  disabled={saveDefinition.isPending}
                  onChange={(event) => setDefaultOptionKey(event.target.value)}
                  className="mt-1 block w-full rounded-md border-0 bg-white/5 px-3 py-1.5 text-sm font-normal shadow-sm ring-1 ring-inset ring-light-600 dark:bg-dark-300 dark:text-dark-1000 dark:ring-dark-700"
                >
                  <option value="">{t`No default`}</option>
                  {options.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.name}
                    </option>
                  ))}
                </select>
              )}
              {definition.type === "checkbox" && (
                <select
                  value={defaultCheckbox}
                  disabled={saveDefinition.isPending}
                  onChange={(event) =>
                    setDefaultCheckbox(event.target.value as "" | "true")
                  }
                  className="mt-1 block w-full rounded-md border-0 bg-white/5 px-3 py-1.5 text-sm font-normal shadow-sm ring-1 ring-inset ring-light-600 dark:bg-dark-300 dark:text-dark-1000 dark:ring-dark-700"
                >
                  <option value="">{t`No default`}</option>
                  <option value="true">{t`Checked`}</option>
                </select>
              )}
            </label>
          </div>
          <AdvancedSettings
            isExpanded={isAdvancedExpanded}
            onToggle={() => setIsAdvancedExpanded((current) => !current)}
          >
            <label className="block text-xs font-medium text-light-900 dark:text-dark-900">
              {t`Section`}
              <Input
                className="mt-1"
                value={sectionLabel}
                maxLength={255}
                placeholder={t`No section`}
                disabled={saveDefinition.isPending}
                onChange={(event) => setSectionLabel(event.target.value)}
              />
            </label>
            {(definition.type === "text" || definition.type === "number") && (
              <label className="block text-xs font-medium text-light-900 dark:text-dark-900">
                {t`Input hint`}
                <Input
                  className="mt-1"
                  value={placeholder}
                  maxLength={255}
                  placeholder={t`Example or expected format`}
                  disabled={saveDefinition.isPending}
                  onChange={(event) => setPlaceholder(event.target.value)}
                />
                <span className="mt-1 block font-normal text-light-700 dark:text-dark-700">
                  {t`Shown only while the card field is empty. This is not a card value.`}
                </span>
              </label>
            )}
          </AdvancedSettings>
          {definition.type === "select" && (
            <OptionDrafts
              options={options}
              setOptions={setOptions}
              disabled={saveDefinition.isPending}
              onRemove={(option) => {
                if (option.key === defaultOptionKey) setDefaultOptionKey("");
              }}
            />
          )}
          {archivedOptions.length > 0 && (
            <p className="text-xs text-light-700 dark:text-dark-700">
              {t`Archived options`}:{" "}
              {archivedOptions.map(({ name }) => name).join(", ")}
            </p>
          )}
          {isDeleteConfirmationVisible && (
            <div className="rounded-md bg-light-200 p-3 text-sm dark:bg-dark-300">
              <p className="text-light-1000 dark:text-dark-1000">{t`Delete this field? It will be removed from the board and all cards.`}</p>
              <div className="mt-3 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsDeleteConfirmationVisible(false)}
                >{t`Cancel`}</Button>
                <Button
                  type="button"
                  size="sm"
                  isLoading={deleteDefinition.isPending}
                  onClick={() =>
                    deleteDefinition.mutate(
                      { fieldPublicId: definition.publicId },
                      {
                        onSuccess: () => setIsDeleteConfirmationVisible(false),
                      },
                    )
                  }
                >{t`Delete`}</Button>
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-light-400 pt-4 dark:border-dark-500">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={saveDefinition.isPending}
              onClick={() => setIsDeleteConfirmationVisible(true)}
              iconLeft={<HiOutlineTrash className="h-4 w-4" />}
            >{t`Delete field`}</Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={saveDefinition.isPending}
                onClick={() => {
                  resetDraft();
                  onToggle();
                }}
              >{t`Cancel`}</Button>
              <Button
                type="submit"
                size="sm"
                disabled={
                  !name.trim() || hasInvalidOption || hasInvalidNumberDefault
                }
                isLoading={saveDefinition.isPending}
              >{t`Save`}</Button>
            </div>
          </div>
        </form>
      )}
    </section>
  );
}

function CreateField({
  boardPublicId,
  isExpanded,
  onToggle,
}: {
  boardPublicId: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
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
  const [options, setOptions] = useState<DraftOption[]>([]);
  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState(false);
  const resetDraft = () => {
    setName("");
    setDescription("");
    setPlaceholder("");
    setSectionLabel("");
    setPlacement("sidebar");
    setType("select");
    setShowOnCard(true);
    setOptions([]);
    setIsAdvancedExpanded(false);
  };
  const createDefinition = api.customField.createDefinition.useMutation({
    onSuccess: async () => {
      resetDraft();
      await Promise.all([
        utils.customField.definitionsByBoard.invalidate({ boardPublicId }),
        utils.board.byId.invalidate({ boardPublicId }),
      ]);
      onToggle();
    },
    onError: () =>
      showPopup({
        header: t`Unable to create custom field`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      }),
  });
  const hasInvalidOption = options.some((option) => !option.name.trim());

  return (
    <section
      className={`rounded-md border border-dashed border-light-500 dark:border-dark-500 ${
        isExpanded ? "bg-light-100 dark:bg-dark-200" : ""
      }`}
    >
      <button
        type="button"
        aria-expanded={isExpanded}
        className="flex w-full items-center gap-3 rounded-md px-4 py-3 text-left hover:bg-light-200 dark:hover:bg-dark-300"
        onClick={onToggle}
      >
        {isExpanded ? (
          <HiChevronDown className="h-4 w-4" />
        ) : (
          <HiChevronRight className="h-4 w-4" />
        )}
        <HiOutlinePlus className="h-4 w-4" />
        <span className="text-sm font-medium">{t`Create new field`}</span>
      </button>
      {isExpanded && (
        <form
          className="space-y-4 border-t border-light-400 p-4 dark:border-dark-500"
          onSubmit={(event) => {
            event.preventDefault();
            const fieldName = name.trim();
            if (!fieldName || hasInvalidOption) return;
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
                    options: options.map((option) => ({
                      name: option.name.trim(),
                      colourCode: option.colourCode,
                    })),
                  }
                : {}),
            });
          }}
        >
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
            <label className="block text-xs font-medium text-light-900 dark:text-dark-900">
              {t`Field name`}
              <Input
                className="mt-1"
                value={name}
                maxLength={255}
                disabled={createDefinition.isPending}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label className="block text-xs font-medium text-light-900 dark:text-dark-900">
              {t`Field type`}
              <select
                value={type}
                disabled={createDefinition.isPending}
                onChange={(event) =>
                  setType(event.target.value as Definition["type"])
                }
                className="mt-1 block w-full rounded-md border-0 bg-white/5 px-3 py-1.5 text-sm font-normal shadow-sm ring-1 ring-inset ring-light-600 dark:bg-dark-300 dark:text-dark-1000 dark:ring-dark-700"
              >
                {fieldTypes.map((fieldType) => (
                  <option key={fieldType} value={fieldType}>
                    {getFieldTypeLabel(fieldType)}
                  </option>
                ))}
              </select>
              <span className="mt-1 block font-normal text-light-700 dark:text-dark-700">
                {getFieldTypeDescription(type)}
              </span>
            </label>
          </div>
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
          <Toggle
            label={t`Show on card front`}
            labelPosition="after"
            isChecked={showOnCard}
            disabled={createDefinition.isPending}
            onChange={() => setShowOnCard((current) => !current)}
          />
          <div className="grid gap-3">
            <label className="block text-xs font-medium text-light-900 dark:text-dark-900">
              {t`Description`}
              <Input
                className="mt-1"
                value={description}
                maxLength={2000}
                placeholder={t`Field description (optional)`}
                disabled={createDefinition.isPending}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
          </div>
          <AdvancedSettings
            isExpanded={isAdvancedExpanded}
            onToggle={() => setIsAdvancedExpanded((current) => !current)}
          >
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
            {(type === "text" || type === "number") && (
              <label className="block text-xs font-medium text-light-900 dark:text-dark-900">
                {t`Input hint`}
                <Input
                  className="mt-1"
                  value={placeholder}
                  maxLength={255}
                  placeholder={t`Example or expected format`}
                  disabled={createDefinition.isPending}
                  onChange={(event) => setPlaceholder(event.target.value)}
                />
                <span className="mt-1 block font-normal text-light-700 dark:text-dark-700">
                  {t`Shown only while the card field is empty. This is not a card value.`}
                </span>
              </label>
            )}
          </AdvancedSettings>
          {type === "select" && (
            <OptionDrafts
              options={options}
              setOptions={setOptions}
              disabled={createDefinition.isPending}
            />
          )}
          <div className="flex justify-end gap-2 border-t border-light-400 pt-4 dark:border-dark-500">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={createDefinition.isPending}
              onClick={() => {
                resetDraft();
                onToggle();
              }}
            >{t`Cancel`}</Button>
            <Button
              type="submit"
              size="sm"
              disabled={!name.trim() || hasInvalidOption}
              isLoading={createDefinition.isPending}
              iconLeft={<HiOutlinePlus className="h-4 w-4" />}
            >{t`Create field`}</Button>
          </div>
        </form>
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
  const [expandedFieldPublicId, setExpandedFieldPublicId] = useState<
    string | null
  >(null);
  const [isCreateExpanded, setIsCreateExpanded] = useState(false);
  const { data: definitions = [], isLoading } =
    api.customField.definitionsByBoard.useQuery(
      { boardPublicId },
      { enabled: boardPublicId.length === 12 },
    );

  return (
    <div className="max-h-[80vh] overflow-y-auto rounded-lg bg-white dark:bg-dark-100">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-light-400 bg-white px-5 py-4 dark:border-dark-500 dark:bg-dark-100">
        <div>
          <h2 className="text-sm font-medium text-neutral-900 dark:text-dark-1000">{t`Custom fields`}</h2>
          <p className="mt-1 text-xs text-light-800 dark:text-dark-800">{t`Open a field to edit its settings.`}</p>
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
              isExpanded={expandedFieldPublicId === definition.publicId}
              onToggle={() => {
                setIsCreateExpanded(false);
                setExpandedFieldPublicId((current) =>
                  current === definition.publicId ? null : definition.publicId,
                );
              }}
              onSaved={() => setExpandedFieldPublicId(null)}
            />
          ))
        ) : (
          <p className="rounded-md border border-dashed border-light-500 p-5 text-center text-sm text-light-800 dark:border-dark-500 dark:text-dark-800">{t`This board has no custom fields yet.`}</p>
        )}
        <CreateField
          boardPublicId={boardPublicId}
          isExpanded={isCreateExpanded}
          onToggle={() => {
            setExpandedFieldPublicId(null);
            setIsCreateExpanded((current) => !current);
          }}
        />
      </div>
    </div>
  );
}
