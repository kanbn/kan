import type { ReactNode } from "react";

const Badge = ({ value, iconLeft }: { value: string; iconLeft: ReactNode }) => (
  <span className="mt-1 inline-flex w-fit items-center gap-x-1.5 rounded-full px-2 py-1 text-[14px] font-medium text-neutral-800 ring-1 ring-inset ring-light-800 dark:text-dark-1000 dark:ring-dark-800">
    {iconLeft}
    <div>{value}</div>
  </span>
);

export default Badge;
