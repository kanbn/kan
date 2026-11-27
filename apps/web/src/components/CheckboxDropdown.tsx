import { t } from "@lingui/core/macro";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useState } from "react";
import {
  HiChevronLeft,
  HiChevronRight,
  HiEllipsisHorizontal,
  HiMiniPlus,
  HiMiniXMark,
} from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import Checkbox from "~/components/Checkbox";
import {
  menuContentClass,
  menuIconClass,
  menuItemClass,
  menuSeparatorClass,
} from "~/components/menuStyles";

interface Item {
  key: string;
  value: string;
  selected: boolean;
  leftIcon?: React.ReactNode;
}

interface Group {
  key: string;
  label: string;
  icon: React.ReactNode;
  items: Item[];
  selectedCount?: number;
}

interface CheckboxDropdownProps {
  children: React.ReactNode;
  items?: Item[];
  groups?: Group[];
  createNewItemLabel?: string;
  position?: "left" | "right";
  handleSelect: (
    groupKey: string | null,
    item: { key: string; value: string },
  ) => void;
  handleEdit?: (key: string) => void;
  handleCreate?: () => void;
  asChild?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  onClear?: () => void;
}

const contentClass = twMerge(
  menuContentClass,
  "max-h-[min(350px,var(--radix-popper-available-height))]",
);

export default function CheckboxDropdown({
  children,
  items,
  groups,
  createNewItemLabel,
  position = "left",
  handleSelect,
  handleEdit,
  handleCreate,
  asChild = true,
  disabled = false,
  ariaLabel,
  onClear,
}: CheckboxDropdownProps) {
  const [open, setOpen] = useState(false);
  const [groupKey, setGroupKey] = useState<string | null>(null);

  const renderItems = (items: Item[], groupKey: string | null) => (
    <>
      {items.map((item) => (
        <div key={item.key} className="group/item relative">
          <DropdownMenu.CheckboxItem
            checked={item.selected}
            // Stays open, to tick several.
            onSelect={(e) => {
              e.preventDefault();
              handleSelect(groupKey, { key: item.key, value: item.value });
            }}
            className={twMerge(menuItemClass, handleEdit && "pr-8")}
          >
            <span className="pointer-events-none flex">
              <Checkbox
                checked={item.selected}
                readOnly
                tabIndex={-1}
                aria-hidden
              />
            </span>
            {item.leftIcon}
            <span className="truncate">{item.value}</span>
          </DropdownMenu.CheckboxItem>
          {handleEdit && (
            <button
              type="button"
              aria-label={t`Edit ${item.value}`}
              className="invisible absolute top-1/2 right-1.5 -translate-y-1/2 group-hover/item:visible"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
                handleEdit(item.key);
              }}
            >
              <HiEllipsisHorizontal className="h-4 w-4 text-light-900 dark:text-dark-900" />
            </button>
          )}
        </div>
      ))}
      {!items.length && !handleCreate && (
        <div className="px-2.5 py-1.5 text-xs text-light-900 dark:text-dark-900">
          {t`No items`}
        </div>
      )}
      {handleCreate && (
        <DropdownMenu.Item className={menuItemClass} onSelect={handleCreate}>
          <HiMiniPlus className={menuIconClass} />
          {createNewItemLabel ?? t`Create new`}
        </DropdownMenu.Item>
      )}
    </>
  );

  const selectedCount = (count?: number) =>
    count ? (
      <span className="min-w-5 rounded-full bg-light-300 px-1.5 py-0.5 text-center text-[10px] leading-4 font-semibold dark:bg-dark-400">
        {count}
      </span>
    ) : null;

  const activeGroup = groups?.find((group) => group.key === groupKey);

  return (
    // The menu renders in place, so this wrapper keeps it out of the parent's layout.
    <div className="flex w-full flex-wrap items-center">
      <DropdownMenu.Root
        modal={false}
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setGroupKey(null);
        }}
      >
        <DropdownMenu.Trigger
          asChild={asChild}
          disabled={disabled}
          aria-label={ariaLabel}
          className="h-full w-full cursor-pointer text-left focus-visible:outline-hidden data-disabled:cursor-not-allowed"
        >
          {asChild ? (
            <div tabIndex={disabled ? -1 : 0}>{children}</div>
          ) : (
            children
          )}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content
          align={position === "left" ? "start" : "end"}
          sideOffset={4}
          collisionPadding={8}
          className={contentClass}
          // Rendered in place, so a click must not follow a link it sits in.
          onClick={(e) => e.preventDefault()}
          onKeyDown={(e) => e.stopPropagation()}
          onEscapeKeyDown={(e) => e.stopPropagation()}
        >
          {activeGroup ? (
            <>
              <DropdownMenu.Item
                className={twMerge(menuItemClass, "font-semibold")}
                onSelect={(e) => {
                  e.preventDefault();
                  setGroupKey(null);
                }}
              >
                <HiChevronLeft className={menuIconClass} />
                {activeGroup.label}
                <span className="ml-auto">
                  {selectedCount(activeGroup.selectedCount)}
                </span>
              </DropdownMenu.Item>
              <DropdownMenu.Separator className={menuSeparatorClass} />
              {renderItems(activeGroup.items, activeGroup.key)}
            </>
          ) : (
            <>
              {items && renderItems(items, null)}
              {groups?.map((group) => (
                <DropdownMenu.Item
                  key={group.key}
                  className={menuItemClass}
                  onSelect={(e) => {
                    e.preventDefault();
                    setGroupKey(group.key);
                  }}
                >
                  <span className="flex text-light-900 dark:text-dark-900">
                    {group.icon}
                  </span>
                  {group.label}
                  <span className="ml-auto flex items-center gap-2">
                    {selectedCount(group.selectedCount)}
                    <HiChevronRight className="h-3 w-3 text-light-900 dark:text-dark-900" />
                  </span>
                </DropdownMenu.Item>
              ))}
            </>
          )}
          {onClear && (
            <>
              <DropdownMenu.Separator className={menuSeparatorClass} />
              <DropdownMenu.Item className={menuItemClass} onSelect={onClear}>
                <HiMiniXMark className={menuIconClass} />
                {t`Clear filters`}
              </DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  );
}
