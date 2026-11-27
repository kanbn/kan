import type { InputHTMLAttributes } from "react";

export default function Checkbox(
  props: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className">,
) {
  return (
    <input
      type="checkbox"
      className="h-[14px] w-[14px] shrink-0 cursor-pointer appearance-none rounded-[4px] border border-light-500 bg-transparent ring-0 outline-hidden checked:bg-indigo-600 focus:shadow-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-500"
      {...props}
    />
  );
}
