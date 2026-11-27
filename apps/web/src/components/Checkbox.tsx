import type { InputHTMLAttributes } from "react";
import { HiMiniCheck } from "react-icons/hi2";

// Native checkboxes can't follow the theme, so this draws its own box and tick.
export default function Checkbox(
  props: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className">,
) {
  return (
    <span className="relative flex shrink-0">
      <input
        type="checkbox"
        className="peer h-[14px] w-[14px] cursor-pointer appearance-none rounded-sm border border-light-600 bg-transparent checked:border-light-1000 checked:bg-light-1000 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-600 dark:checked:border-dark-1000 dark:checked:bg-dark-1000"
        {...props}
      />
      <HiMiniCheck className="pointer-events-none absolute inset-0 m-auto hidden h-3 w-3 text-light-50 peer-checked:block dark:text-dark-50" />
    </span>
  );
}
