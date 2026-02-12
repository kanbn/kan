import { Switch } from "@headlessui/react";
import { twMerge } from "tailwind-merge";

const Toggle = ({
  isChecked,
  onChange,
  label,
  disabled,
  showLabel = true,
}: {
  isChecked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
  showLabel?: boolean;
}) => (
  <div className="mr-4 flex items-center justify-end">
    {showLabel && (
      <span className="mr-2 text-xs text-light-900 dark:text-dark-900">
        {label}
      </span>
    )}
    <Switch
      checked={isChecked}
      onChange={onChange}
      disabled={disabled}
      className={twMerge(
        "relative inline-flex h-4 w-6 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-light-800 transition-colors duration-200 ease-in-out focus:outline-none dark:bg-dark-800",
        isChecked && "bg-indigo-600 dark:bg-indigo-600",
      )}
    >
      <span className="sr-only">{label}</span>
      <span
        aria-hidden="true"
        className={twMerge(
          "pointer-events-none inline-block h-3 w-3 translate-x-0 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
          isChecked && "translate-x-2",
        )}
      />
    </Switch>
  </div>
);

export default Toggle;
