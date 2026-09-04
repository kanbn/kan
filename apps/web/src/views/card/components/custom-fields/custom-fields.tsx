import { t } from "@lingui/core/macro";
import { format } from "date-fns";
import { useEffect, useState } from "react";

import type { RouterOutputs } from "~/utils/api";
import Input from "~/components/Input";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

type Card = RouterOutputs["card"]["byId"];
type Definition = Card["list"]["board"]["customFields"][number];
type Value = Card["customFieldValues"][number];

const getDisplayValue = (definition: Definition, value: Value) => {
  switch (definition.type) {
    case "text":
      return value.textValue;
    case "number":
      return value.numberValue;
    case "date":
      return value.dateValue ? format(value.dateValue, "PPp") : null;
    case "checkbox":
      return value.checkboxValue ? t`Checked` : t`Unchecked`;
    case "select":
      return value.optionName;
  }
};

function CustomFieldEditor({
  cardPublicId,
  definition,
  value,
  inputId,
}: {
  cardPublicId: string;
  definition: Definition;
  value?: Value;
  inputId: string;
}) {
  const utils = api.useUtils();
  const { showPopup } = usePopup();
  const [textValue, setTextValue] = useState(
    value?.textValue ?? value?.numberValue ?? "",
  );

  useEffect(() => {
    setTextValue(value?.textValue ?? value?.numberValue ?? "");
  }, [value?.numberValue, value?.textValue]);

  const settle = async () => {
    await Promise.all([
      utils.card.byId.invalidate({ cardPublicId }),
      utils.board.byId.invalidate(),
    ]);
  };
  const setValue = api.customField.setValue.useMutation({
    onSuccess: (storedValue) => {
      utils.card.byId.setData({ cardPublicId }, (card) =>
        card
          ? {
              ...card,
              customFieldValues: [
                ...card.customFieldValues.filter(
                  (item) => item.fieldPublicId !== definition.publicId,
                ),
                storedValue,
              ],
            }
          : card,
      );
    },
    onError: () => {
      setTextValue(value?.textValue ?? value?.numberValue ?? "");
      showPopup({
        header: t`Unable to update custom field`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: settle,
  });
  const clearValue = api.customField.clearValue.useMutation({
    onSuccess: () => {
      utils.card.byId.setData({ cardPublicId }, (card) =>
        card
          ? {
              ...card,
              customFieldValues: card.customFieldValues.filter(
                (item) => item.fieldPublicId !== definition.publicId,
              ),
            }
          : card,
      );
    },
    onError: () =>
      showPopup({
        header: t`Unable to clear custom field`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      }),
    onSettled: settle,
  });

  const updateTextValue = () => {
    const nextValue =
      definition.type === "number" ? textValue.trim() : textValue;
    const previousValue = value?.textValue ?? value?.numberValue ?? "";
    if (nextValue === previousValue) return;
    if (!nextValue.trim()) {
      clearValue.mutate({
        cardPublicId,
        fieldPublicId: definition.publicId,
      });
      return;
    }
    setValue.mutate({
      cardPublicId,
      fieldPublicId: definition.publicId,
      value:
        definition.type === "number"
          ? { type: "number", value: nextValue }
          : { type: "text", value: nextValue },
    });
  };

  if (definition.type === "text" || definition.type === "number") {
    return (
      <Input
        id={inputId}
        type={definition.type === "number" ? "text" : definition.type}
        inputMode={definition.type === "number" ? "decimal" : undefined}
        value={textValue}
        disabled={setValue.isPending || clearValue.isPending}
        onChange={(event) => setTextValue(event.target.value)}
        onBlur={updateTextValue}
        onKeyDown={(event) => {
          if (event.key === "Enter")
            (event.currentTarget as HTMLInputElement).blur();
        }}
      />
    );
  }

  if (definition.type === "select") {
    const activeOptions = definition.options.filter(
      (option) => !option.isArchived,
    );
    const selectedArchivedOption = definition.options.find(
      (option) =>
        option.isArchived && option.publicId === value?.optionPublicId,
    );
    return (
      <select
        id={inputId}
        value={value?.optionPublicId ?? ""}
        disabled={setValue.isPending || clearValue.isPending}
        onChange={(event) => {
          if (!event.target.value) {
            clearValue.mutate({
              cardPublicId,
              fieldPublicId: definition.publicId,
            });
            return;
          }
          setValue.mutate({
            cardPublicId,
            fieldPublicId: definition.publicId,
            value: {
              type: "select",
              optionPublicId: event.target.value,
            },
          });
        }}
        className="block w-full rounded-md border-0 bg-white/5 px-3 py-1.5 text-sm shadow-sm ring-1 ring-inset ring-light-600 dark:bg-dark-300 dark:text-dark-1000 dark:ring-dark-700"
      >
        <option value="">{t`Not set`}</option>
        {selectedArchivedOption && (
          <option value={selectedArchivedOption.publicId} disabled>
            {selectedArchivedOption.name} ({t`Archived`})
          </option>
        )}
        {activeOptions.map((option) => (
          <option key={option.publicId} value={option.publicId}>
            {option.name}
          </option>
        ))}
      </select>
    );
  }

  if (definition.type === "checkbox") {
    return (
      <select
        id={inputId}
        value={
          value?.checkboxValue === true
            ? "true"
            : value?.checkboxValue === false
              ? "false"
              : ""
        }
        disabled={setValue.isPending || clearValue.isPending}
        onChange={(event) => {
          if (!event.target.value) {
            clearValue.mutate({
              cardPublicId,
              fieldPublicId: definition.publicId,
            });
            return;
          }
          setValue.mutate({
            cardPublicId,
            fieldPublicId: definition.publicId,
            value: {
              type: "checkbox",
              value: event.target.value === "true",
            },
          });
        }}
        className="block w-full rounded-md border-0 bg-white/5 px-3 py-1.5 text-sm shadow-sm ring-1 ring-inset ring-light-600 dark:bg-dark-300 dark:text-dark-1000 dark:ring-dark-700"
      >
        <option value="">{t`Not set`}</option>
        <option value="true">{t`Checked`}</option>
        <option value="false">{t`Unchecked`}</option>
      </select>
    );
  }

  return (
    <Input
      id={inputId}
      type="datetime-local"
      value={
        value?.dateValue ? format(value.dateValue, "yyyy-MM-dd'T'HH:mm") : ""
      }
      disabled={setValue.isPending || clearValue.isPending}
      onChange={(event) => {
        if (!event.target.value) {
          clearValue.mutate({
            cardPublicId,
            fieldPublicId: definition.publicId,
          });
          return;
        }
        setValue.mutate({
          cardPublicId,
          fieldPublicId: definition.publicId,
          value: { type: "date", value: new Date(event.target.value) },
        });
      }}
    />
  );
}

export function CustomFields({
  cardPublicId,
  definitions,
  values,
  disabled,
}: {
  cardPublicId: string;
  definitions: Definition[];
  values: Value[];
  disabled: boolean;
}) {
  if (definitions.length === 0) return null;

  const valuesByFieldId = new Map(
    values.map((value) => [value.fieldPublicId, value]),
  );

  return (
    <section className="mt-6 border-t border-light-300 pt-5 dark:border-dark-300">
      <h2 className="mb-4 text-sm font-medium text-neutral-900 dark:text-dark-1000">
        {t`Custom fields`}
      </h2>
      <div className="space-y-4">
        {definitions.map((definition) => {
          const value = valuesByFieldId.get(definition.publicId);
          if (disabled && !value) return null;
          const inputId = `custom-field-${definition.publicId}`;

          return (
            <div key={definition.publicId} className="space-y-1.5">
              <label
                htmlFor={disabled ? undefined : inputId}
                className="block text-xs font-medium text-light-900 dark:text-dark-900"
              >
                {definition.name}
              </label>
              {disabled && value ? (
                <div className="min-h-8 rounded-md bg-light-200 px-3 py-2 text-sm text-neutral-900 dark:bg-dark-300 dark:text-dark-1000">
                  {getDisplayValue(definition, value)}
                  {value.optionArchivedAt && (
                    <span className="ml-2 text-xs text-light-700 dark:text-dark-700">
                      ({t`Archived`})
                    </span>
                  )}
                </div>
              ) : (
                <CustomFieldEditor
                  cardPublicId={cardPublicId}
                  definition={definition}
                  value={value}
                  inputId={inputId}
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
