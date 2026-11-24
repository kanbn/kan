import { twMerge } from "tailwind-merge";

export function SettingsRow({
  title,
  description,
  stacked,
  children,
}: {
  title: string;
  description?: string;
  stacked?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={twMerge(
        "flex flex-col gap-3 py-3",
        !stacked && "sm:flex-row sm:items-center sm:justify-between sm:gap-8",
      )}
    >
      <div className="min-w-0">
        <h2 className="text-sm font-medium text-neutral-900 dark:text-dark-1000">
          {title}
        </h2>
        {description && (
          <p className="mt-1 max-w-[440px] text-xs text-pretty text-light-900 dark:text-dark-900">
            {description}
          </p>
        )}
      </div>
      {children && <div className="min-w-0 shrink-0">{children}</div>}
    </div>
  );
}
