import { Listbox, Transition } from "@headlessui/react";
import { t } from "@lingui/core/macro";
import { Fragment } from "react";
import { HiCheck, HiChevronUpDown } from "react-icons/hi2";

import { colours } from "@kan/shared/constants";

function ColourSwatch({ colourCode }: { colourCode: string | null }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-3 w-3 shrink-0 rounded-full ${
        colourCode ? "" : "border border-light-700 dark:border-dark-700"
      }`}
      style={colourCode ? { backgroundColor: colourCode } : undefined}
    />
  );
}

export function CustomFieldColourPicker({
  value,
  onChange,
  disabled,
}: {
  value: string | null;
  onChange: (colourCode: string | null) => void;
  disabled?: boolean;
}) {
  const knownColour = colours.find(({ code }) => code === value);
  const choices = [
    { name: t`No colour`, code: null },
    ...(!knownColour && value
      ? [{ name: t`Imported colour`, code: value }]
      : []),
    ...colours,
  ];
  const selected = choices.find(({ code }) => code === value) ?? {
    name: t`No colour`,
    code: null,
  };

  return (
    <Listbox value={value} onChange={onChange} disabled={disabled}>
      <div className="relative shrink-0">
        <Listbox.Button
          className="flex h-9 w-36 items-center gap-2 rounded-md bg-white/5 px-3 text-left text-sm shadow-sm ring-1 ring-inset ring-light-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-dark-300 dark:text-dark-1000 dark:ring-dark-700"
          aria-label={t`Option colour`}
        >
          <ColourSwatch colourCode={selected.code} />
          <span className="min-w-0 flex-1 truncate">{selected.name}</span>
          <HiChevronUpDown className="h-4 w-4 shrink-0 text-light-700 dark:text-dark-700" />
        </Listbox.Button>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options className="absolute z-20 mt-1 max-h-60 w-44 overflow-auto rounded-md bg-light-50 py-1 text-sm shadow-lg ring-1 ring-black/5 focus:outline-none dark:bg-dark-300">
            {choices.map((choice) => (
              <Listbox.Option
                key={choice.code ?? "none"}
                value={choice.code}
                className="flex cursor-default select-none items-center gap-2 px-3 py-2 text-neutral-900 hover:bg-light-200 dark:text-dark-1000 dark:hover:bg-dark-400"
              >
                {({ selected: isSelected }) => (
                  <>
                    <ColourSwatch colourCode={choice.code} />
                    <span className="min-w-0 flex-1 truncate">
                      {choice.name}
                    </span>
                    {isSelected && <HiCheck className="h-4 w-4" />}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
}
