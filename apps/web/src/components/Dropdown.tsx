import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { twMerge } from "tailwind-merge";

import { menuContentClass, menuItemClass } from "~/components/menuStyles";

export default function Dropdown({
  items,
  children,
  disabled,
  ariaLabel,
  menuGap = "sm",
  buttonClassName,
}: {
  items: {
    label: string;
    action?: () => void;
    icon?: React.ReactNode;
    disabled?: boolean;
  }[];
  children: React.ReactNode;
  disabled?: boolean;
  ariaLabel?: string;
  menuGap?: "sm" | "md";
  buttonClassName?: string;
}) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        disabled={disabled}
        aria-label={ariaLabel}
        className={twMerge(
          "flex h-7 w-7 items-center justify-center rounded-[5px] hover:bg-light-200 focus:outline-hidden dark:hover:bg-dark-200",
          buttonClassName,
        )}
      >
        {children}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        align="end"
        sideOffset={menuGap === "sm" ? 4 : 8}
        collisionPadding={8}
        className={menuContentClass}
        onKeyDown={(e) => e.stopPropagation()}
        onEscapeKeyDown={(e) => e.stopPropagation()}
      >
        {items.map((item) => (
          <DropdownMenu.Item
            key={item.label}
            disabled={item.disabled ?? !item.action}
            onSelect={item.action}
            className={menuItemClass}
          >
            {item.icon}
            {item.label}
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
