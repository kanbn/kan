import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import { HiCheck, HiChevronUpDown } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

interface CustomFieldSelectOption {
  value: string;
  label: string;
  colourCode?: string | null;
  disabled?: boolean;
}

export function CustomFieldSelect({
  id,
  ariaLabel,
  value,
  options,
  disabled,
  onChange,
}: {
  id: string;
  ariaLabel: string;
  value: string;
  options: CustomFieldSelectOption[];
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <Listbox value={value} onChange={onChange} disabled={disabled}>
      <div className="relative">
        <ListboxButton
          id={id}
          aria-label={ariaLabel}
          className="relative block w-full cursor-pointer rounded-md border-0 bg-white/5 py-1.5 pl-3 pr-9 text-left text-sm shadow-sm ring-1 ring-inset ring-light-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-light-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-dark-300 dark:text-dark-1000 dark:ring-dark-700 dark:focus:ring-dark-700"
        >
          <span className="flex min-w-0 items-center gap-2">
            {selectedOption?.colourCode && (
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/10"
                style={{ backgroundColor: selectedOption.colourCode }}
              />
            )}
            <span className="truncate">{selectedOption?.label}</span>
          </span>
          <HiChevronUpDown
            aria-hidden
            className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-light-700 dark:text-dark-700"
          />
        </ListboxButton>
        <ListboxOptions className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-light-200 bg-white py-1 text-sm shadow-lg ring-1 ring-black/5 focus:outline-none dark:border-dark-400 dark:bg-dark-200">
          {options.map((option) => (
            <ListboxOption
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              className={({ focus, disabled: optionDisabled }) =>
                twMerge(
                  "relative flex cursor-pointer select-none items-center gap-2 py-2 pl-3 pr-9 text-light-900 dark:text-dark-900",
                  focus &&
                    "bg-light-200 text-light-1000 dark:bg-dark-400 dark:text-dark-1000",
                  optionDisabled && "cursor-default opacity-50",
                )
              }
            >
              {({ selected }) => (
                <>
                  {option.colourCode && (
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/10"
                      style={{ backgroundColor: option.colourCode }}
                    />
                  )}
                  <span className="truncate">{option.label}</span>
                  {selected && (
                    <HiCheck aria-hidden className="absolute right-3 h-4 w-4" />
                  )}
                </>
              )}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  );
}
