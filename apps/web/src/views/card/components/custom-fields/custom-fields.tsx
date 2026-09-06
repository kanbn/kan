import type { Locale } from "date-fns";
import { t } from "@lingui/core/macro";
import { format } from "date-fns";
import { useEffect, useRef, useState } from "react";

import type { RouterOutputs } from "~/utils/api";
import Button from "~/components/Button";
import Input from "~/components/Input";
import { useLocalisation } from "~/hooks/useLocalisation";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";
import { formatCustomFieldDate } from "./custom-field-date";
import { CustomFieldSelect } from "./custom-field-select";

type Card = RouterOutputs["card"]["byId"];
type Definition = Card["list"]["board"]["customFields"][number];
type Value = Card["customFieldValues"][number];

const getDisplayValue = (
  definition: Definition,
  value: Value,
  dateLocale: Locale,
) => {
  switch (definition.type) {
    case "text":
      return value.textValue;
    case "number":
      return value.numberValue;
    case "date":
      return value.dateValue
        ? formatCustomFieldDate(value.dateValue, dateLocale)
        : null;
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
  const persistedTextValue = value?.textValue ?? value?.numberValue ?? "";
  const persistedDateValue = value?.dateValue
    ? format(value.dateValue, "yyyy-MM-dd'T'HH:mm")
    : "";
  const [textValue, setTextValue] = useState(persistedTextValue);
  const [dateValue, setDateValue] = useState(persistedDateValue);
  const skipNextCommit = useRef(false);

  useEffect(() => {
    setTextValue(persistedTextValue);
  }, [persistedTextValue]);

  useEffect(() => {
    setDateValue(persistedDateValue);
  }, [persistedDateValue]);

  const resetDrafts = () => {
    setTextValue(persistedTextValue);
    setDateValue(persistedDateValue);
  };

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
      resetDrafts();
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
    onError: () => {
      resetDrafts();
      showPopup({
        header: t`Unable to clear custom field`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: settle,
  });

  const updateTextValue = () => {
    if (skipNextCommit.current) {
      skipNextCommit.current = false;
      return;
    }
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
  const cancelTextUpdate = (input: HTMLInputElement | HTMLTextAreaElement) => {
    skipNextCommit.current = true;
    setTextValue(persistedTextValue);
    input.blur();
  };

  const updateDateValue = () => {
    if (skipNextCommit.current) {
      skipNextCommit.current = false;
      return;
    }
    if (dateValue === persistedDateValue) return;
    if (!dateValue) {
      clearValue.mutate({
        cardPublicId,
        fieldPublicId: definition.publicId,
      });
      return;
    }
    setValue.mutate({
      cardPublicId,
      fieldPublicId: definition.publicId,
      value: { type: "date", value: new Date(dateValue) },
    });
  };

  const cancelDateUpdate = (input: HTMLInputElement) => {
    skipNextCommit.current = true;
    setDateValue(persistedDateValue);
    input.blur();
  };

  if (definition.type === "text") {
    return (
      <textarea
        id={inputId}
        aria-label={definition.name}
        rows={3}
        maxLength={10000}
        value={textValue}
        placeholder={definition.placeholder ?? undefined}
        disabled={setValue.isPending || clearValue.isPending}
        onChange={(event) => setTextValue(event.target.value)}
        onBlur={updateTextValue}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            cancelTextUpdate(event.currentTarget);
          }
        }}
        className="block w-full resize-y rounded-md border-0 bg-dark-300 bg-white/5 py-1.5 text-sm shadow-sm ring-1 ring-inset ring-light-600 placeholder:text-dark-800 focus:ring-2 focus:ring-inset focus:ring-light-700 dark:text-dark-1000 dark:ring-dark-700 dark:focus:ring-dark-700 sm:leading-6"
      />
    );
  }

  if (definition.type === "number") {
    return (
      <Input
        id={inputId}
        aria-label={definition.name}
        type="text"
        inputMode="decimal"
        maxLength={100}
        value={textValue}
        placeholder={definition.placeholder ?? undefined}
        disabled={setValue.isPending || clearValue.isPending}
        onChange={(event) => setTextValue(event.target.value)}
        onBlur={updateTextValue}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            (event.currentTarget as HTMLInputElement).blur();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            cancelTextUpdate(event.currentTarget as HTMLInputElement);
          }
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
    const options = [
      { value: "", label: t`Not set` },
      ...(selectedArchivedOption
        ? [
            {
              value: selectedArchivedOption.publicId,
              label: `${selectedArchivedOption.name} (${t`Archived`})`,
              colourCode: selectedArchivedOption.colourCode,
              disabled: true,
            },
          ]
        : []),
      ...activeOptions.map((option) => ({
        value: option.publicId,
        label: option.name,
        colourCode: option.colourCode,
      })),
    ];
    return (
      <CustomFieldSelect
        id={inputId}
        ariaLabel={definition.name}
        value={value?.optionPublicId ?? ""}
        options={options}
        disabled={setValue.isPending || clearValue.isPending}
        onChange={(nextValue) => {
          if (!nextValue) {
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
              optionPublicId: nextValue,
            },
          });
        }}
      />
    );
  }

  if (definition.type === "checkbox") {
    const checkboxValue = value?.checkboxValue;
    const isSet = checkboxValue !== null && checkboxValue !== undefined;
    const status = isSet
      ? checkboxValue
        ? t`Checked`
        : t`Unchecked`
      : t`Not set`;

    return (
      <div className="flex min-h-9 items-center gap-2">
        <input
          id={inputId}
          type="checkbox"
          aria-label={definition.name}
          checked={checkboxValue === true}
          disabled={setValue.isPending || clearValue.isPending}
          onChange={(event) =>
            setValue.mutate({
              cardPublicId,
              fieldPublicId: definition.publicId,
              value: {
                type: "checkbox",
                value: event.target.checked,
              },
            })
          }
          className="h-4 w-4 cursor-pointer appearance-none rounded-md border border-light-500 bg-transparent outline-none ring-0 checked:bg-blue-600 focus:shadow-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none disabled:cursor-default disabled:opacity-60 dark:border-dark-500 dark:hover:border-dark-500"
        />
        <span className="text-sm text-light-900 dark:text-dark-900">
          {status}
        </span>
        {isSet && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            disabled={setValue.isPending || clearValue.isPending}
            onClick={() =>
              clearValue.mutate({
                cardPublicId,
                fieldPublicId: definition.publicId,
              })
            }
          >
            {t`Not set`}
          </Button>
        )}
      </div>
    );
  }

  return (
    <Input
      id={inputId}
      aria-label={definition.name}
      type="datetime-local"
      value={dateValue}
      disabled={setValue.isPending || clearValue.isPending}
      onChange={(event) => setDateValue(event.target.value)}
      onBlur={updateDateValue}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          (event.currentTarget as HTMLInputElement).blur();
        }
        if (event.key === "Escape") {
          event.preventDefault();
          cancelDateUpdate(event.currentTarget as HTMLInputElement);
        }
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
  const { dateLocale } = useLocalisation();

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
                  {getDisplayValue(definition, value, dateLocale)}
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
              {definition.description && (
                <p className="text-xs text-light-700 dark:text-dark-700">
                  {definition.description}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
