export const menuContentClass =
  "z-200 max-h-(--radix-popper-available-height) w-56 overflow-y-auto rounded-md border border-light-200 bg-white p-1 shadow-lg ring-1 ring-black/5 outline-hidden dark:border-dark-400 dark:bg-dark-300";
export const menuItemClass =
  "flex cursor-pointer items-center gap-2 rounded-[5px] px-2.5 py-1.5 text-xs text-neutral-900 outline-hidden select-none data-disabled:cursor-default data-disabled:opacity-60 data-highlighted:bg-light-200 data-[state=open]:bg-light-200 dark:text-dark-950 dark:data-highlighted:bg-dark-400 dark:data-[state=open]:bg-dark-400";
export const menuIconClass =
  "h-3 w-3 shrink-0 text-light-900 dark:text-dark-900";
// For icons passed in by callers, whatever size they were drawn at.
export const menuIconSlotClass =
  "flex shrink-0 text-light-900 dark:text-dark-900 [&>svg]:h-3 [&>svg]:w-3";
export const menuSeparatorClass =
  "my-1 border-t border-light-200 dark:border-dark-400";
