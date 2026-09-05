import { Dialog, Transition } from "@headlessui/react";
import { t } from "@lingui/core/macro";
import { Fragment, useMemo, useState } from "react";

import type { ScalarCustomFieldFilter } from "./custom-field-filters";
import Button from "~/components/Button";
import Input from "~/components/Input";
import { isValidCustomFieldNumberValue } from "./custom-field-filters";

type ScalarFieldType = "text" | "number" | "date";
type Operator = "contains" | "equals" | "range" | "before" | "after";

interface Props {
  field: { publicId: string; name: string; type: ScalarFieldType };
  initialFilter: ScalarCustomFieldFilter | null;
  onApply: (filter: ScalarCustomFieldFilter) => Promise<void>;
  onClear: () => Promise<void>;
  onClose: () => void;
}

const formatInputDate = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toDateBoundary = (value: string, endOfDay: boolean) => {
  const parts = value.split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  return new Date(
    year,
    month - 1,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  ).toISOString();
};

const getInitialValues = (
  fieldType: ScalarFieldType,
  filter: ScalarCustomFieldFilter | null,
) => {
  if (!filter || filter.type !== fieldType)
    return {
      operator: (fieldType === "text"
        ? "contains"
        : fieldType === "number"
          ? "equals"
          : "before") as Operator,
      first: "",
      second: "",
    };

  if (filter.type === "text")
    return {
      operator: "contains" as const,
      first: filter.contains,
      second: "",
    };
  if (filter.type === "number")
    return filter.operator === "equals"
      ? { operator: "equals" as const, first: filter.value, second: "" }
      : {
          operator: "range" as const,
          first: filter.min ?? "",
          second: filter.max ?? "",
        };
  return filter.operator === "range"
    ? {
        operator: "range" as const,
        first: formatInputDate(filter.from),
        second: formatInputDate(filter.to),
      }
    : {
        operator: filter.operator,
        first: formatInputDate(filter.value),
        second: "",
      };
};

const CustomFieldFilterPanel = ({
  field,
  initialFilter,
  onApply,
  onClear,
  onClose,
}: Props) => {
  const initialValues = useMemo(
    () => getInitialValues(field.type, initialFilter),
    [field.type, initialFilter],
  );
  const [operator, setOperator] = useState<Operator>(initialValues.operator);
  const [first, setFirst] = useState(initialValues.first);
  const [second, setSecond] = useState(initialValues.second);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid = useMemo(() => {
    if (field.type === "text")
      return first.trim().length > 0 && first.length <= 255;
    if (field.type === "number") {
      const validNumber = (value: string) =>
        isValidCustomFieldNumberValue(value.trim());
      return operator === "equals"
        ? validNumber(first)
        : (first.trim() !== "" || second.trim() !== "") &&
            (first.trim() === "" || validNumber(first)) &&
            (second.trim() === "" || validNumber(second));
    }
    return operator === "range"
      ? (first !== "" || second !== "") &&
          (first === "" || second === "" || first <= second)
      : first !== "";
  }, [field.type, first, operator, second]);

  const apply = async () => {
    if (!isValid) return;
    let filter: ScalarCustomFieldFilter;
    if (field.type === "text") filter = { type: "text", contains: first };
    else if (field.type === "number")
      filter =
        operator === "equals"
          ? { type: "number", operator, value: first.trim() }
          : {
              type: "number",
              operator: "range",
              min: first.trim() || undefined,
              max: second.trim() || undefined,
            };
    else
      filter =
        operator === "range"
          ? {
              type: "date",
              operator,
              from: first === "" ? undefined : toDateBoundary(first, false),
              to: second === "" ? undefined : toDateBoundary(second, true),
            }
          : {
              type: "date",
              operator: operator === "after" ? "after" : "before",
              value: toDateBoundary(first, operator === "after"),
            };

    setIsSubmitting(true);
    try {
      await onApply(filter);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const clear = async () => {
    setIsSubmitting(true);
    try {
      await onClear();
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const operators =
    field.type === "text"
      ? [{ value: "contains", label: t`Contains` }]
      : field.type === "number"
        ? [
            { value: "equals", label: t`Equals` },
            { value: "range", label: t`Range` },
          ]
        : [
            { value: "before", label: t`Before` },
            { value: "after", label: t`After` },
            { value: "range", label: t`Range` },
          ];
  const isRange = operator === "range";
  const inputType = field.type === "date" ? "date" : "text";

  return (
    <Transition.Root show as={Fragment}>
      <Dialog as="div" className="relative z-[60]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/20 dark:bg-black/40" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto p-4">
          <div className="flex min-h-full items-center justify-center">
            <Dialog.Panel className="max-h-[min(80vh,420px)] w-[min(360px,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-light-600 bg-light-50 p-4 shadow-xl dark:border-dark-600 dark:bg-dark-200">
              <Dialog.Title className="text-sm font-semibold text-light-1000 dark:text-dark-1000">
                {field.name}
              </Dialog.Title>
              <p className="mt-1 text-xs text-light-900 dark:text-dark-900">
                {t`Filter by value`}
              </p>

              <form
                className="mt-4 space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void apply();
                }}
              >
                <label className="block text-xs font-medium text-light-1000 dark:text-dark-1000">
                  {t`Operator`}
                  <select
                    aria-label={t`Operator`}
                    value={operator}
                    onChange={(event) => {
                      setOperator(event.target.value as Operator);
                      setFirst("");
                      setSecond("");
                    }}
                    className="mt-1 block w-full rounded-md border-0 bg-light-50 py-1.5 text-sm text-light-1000 shadow-sm ring-1 ring-inset ring-light-600 focus:ring-2 focus:ring-inset focus:ring-light-700 dark:bg-dark-300 dark:text-dark-1000 dark:ring-dark-700"
                  >
                    {operators.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-xs font-medium text-light-1000 dark:text-dark-1000">
                  {isRange ? t`From` : t`Value`}
                  <Input
                    autoFocus
                    aria-label={isRange ? t`From` : t`Value`}
                    type={inputType}
                    inputMode={field.type === "number" ? "decimal" : undefined}
                    maxLength={
                      field.type === "text"
                        ? 255
                        : field.type === "number"
                          ? 100
                          : undefined
                    }
                    value={first}
                    onChange={(event) => setFirst(event.target.value)}
                    className="mt-1"
                  />
                </label>

                {isRange && (
                  <label className="block text-xs font-medium text-light-1000 dark:text-dark-1000">
                    {t`To`}
                    <Input
                      aria-label={t`To`}
                      type={inputType}
                      inputMode={
                        field.type === "number" ? "decimal" : undefined
                      }
                      maxLength={field.type === "number" ? 100 : undefined}
                      value={second}
                      onChange={(event) => setSecond(event.target.value)}
                      className="mt-1"
                    />
                  </label>
                )}

                <div className="flex items-center justify-end gap-2">
                  {initialFilter && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={isSubmitting}
                      onClick={() => void clear()}
                    >
                      {t`Clear`}
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={isSubmitting}
                    onClick={onClose}
                  >
                    {t`Cancel`}
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!isValid || isSubmitting}
                    isLoading={isSubmitting}
                  >
                    {t`Apply`}
                  </Button>
                </div>
              </form>
            </Dialog.Panel>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default CustomFieldFilterPanel;
