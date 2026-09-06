import { t } from "@lingui/core/macro";
import { format } from "date-fns";

import type { RouterInputs, RouterOutputs } from "~/utils/api";
import Button from "~/components/Button";
import Input from "~/components/Input";
import { CustomFieldSelect } from "~/views/card/components/custom-fields/custom-field-select";

type Definition = RouterOutputs["customField"]["definitionsByBoard"][number];
export type CustomFieldDraftValue = NonNullable<
  RouterInputs["customField"]["setValue"]["value"]
>;

export function CustomFieldDraftInput({
  definition,
  id,
  value,
  onChange,
}: {
  definition: Definition;
  id: string;
  value: CustomFieldDraftValue | null;
  onChange: (value: CustomFieldDraftValue | null) => void;
}) {
  if (definition.type === "text")
    return (
      <textarea
        id={id}
        rows={2}
        maxLength={10000}
        value={value?.type === "text" ? value.value : ""}
        placeholder={definition.placeholder ?? undefined}
        onChange={(event) =>
          onChange(
            event.target.value
              ? { type: "text", value: event.target.value }
              : null,
          )
        }
        className="block w-full resize-y rounded-md border-0 bg-white/5 px-3 py-1.5 text-sm shadow-sm ring-1 ring-inset ring-light-600 placeholder:text-light-700 focus:ring-2 focus:ring-inset focus:ring-light-700 dark:bg-dark-300 dark:text-dark-1000 dark:ring-dark-700 dark:placeholder:text-dark-700 dark:focus:ring-dark-700"
      />
    );

  if (definition.type === "number")
    return (
      <Input
        id={id}
        type="text"
        inputMode="decimal"
        maxLength={100}
        value={value?.type === "number" ? value.value : ""}
        placeholder={definition.placeholder ?? undefined}
        onChange={(event) =>
          onChange(
            event.target.value
              ? { type: "number", value: event.target.value }
              : null,
          )
        }
      />
    );

  if (definition.type === "date")
    return (
      <Input
        id={id}
        type="datetime-local"
        value={
          value?.type === "date"
            ? format(value.value, "yyyy-MM-dd'T'HH:mm")
            : ""
        }
        onChange={(event) =>
          onChange(
            event.target.value
              ? { type: "date", value: new Date(event.target.value) }
              : null,
          )
        }
      />
    );

  if (definition.type === "select")
    return (
      <CustomFieldSelect
        id={id}
        ariaLabel={definition.name}
        value={value?.type === "select" ? value.optionPublicId : ""}
        options={[
          { value: "", label: t`Not set` },
          ...definition.options
            .filter((option) => !option.isArchived)
            .map((option) => ({
              value: option.publicId,
              label: option.name,
              colourCode: option.colourCode,
            })),
        ]}
        disabled={false}
        onChange={(optionPublicId) =>
          onChange(optionPublicId ? { type: "select", optionPublicId } : null)
        }
      />
    );

  const isSet = value?.type === "checkbox";
  return (
    <div className="flex min-h-9 items-center gap-2">
      <input
        id={id}
        type="checkbox"
        aria-label={definition.name}
        checked={isSet && value.value}
        onChange={(event) =>
          onChange({ type: "checkbox", value: event.target.checked })
        }
        className="h-4 w-4 cursor-pointer appearance-none rounded-md border border-light-500 bg-transparent outline-none ring-0 checked:bg-blue-600 focus:shadow-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none dark:border-dark-500 dark:hover:border-dark-500"
      />
      <span className="text-sm text-light-900 dark:text-dark-900">
        {isSet ? (value.value ? t`Checked` : t`Unchecked`) : t`Not set`}
      </span>
      {isSet && (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => onChange(null)}
        >
          {t`Not set`}
        </Button>
      )}
    </div>
  );
}
