import { Menu, Transition } from "@headlessui/react";
import { Fragment, useState } from "react";
import {
  HiChevronLeft,
  HiChevronRight,
  HiEllipsisHorizontal,
  HiMiniPlus,
} from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

interface Item {
  key: string;
  value: string;
  selected?: boolean;
  leftIcon?: React.ReactNode;
}

interface Group {
  key: string;
  label: string;
  icon: React.ReactNode;
  items?: Item[];
  groups?: Group[];
  selectedCount?: number;
}

interface CheckboxDropdownProps {
  children: React.ReactNode;
  items?: Item[];
  groups?: Group[];
  createNewItemLabel?: string;
  menuSpacing?: "sm" | "md" | "lg";
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
  backLabel?: string;
  footer?: React.ReactNode;
}

export default function CheckboxDropdown({
  children,
  items,
  groups,
  createNewItemLabel = "Create new",
  menuSpacing = "sm",
  position = "left",
  handleSelect,
  handleEdit,
  handleCreate,
  asChild = true,
  disabled = false,
  ariaLabel,
  backLabel = "Back",
  footer,
}: CheckboxDropdownProps) {
  const [selectedGroupPath, setSelectedGroupPath] = useState<string[]>([]);

  const findGroup = (path: string[]) => {
    let availableGroups = groups;
    let selectedGroup: Group | undefined;

    for (const key of path) {
      selectedGroup = availableGroups?.find((group) => group.key === key);
      if (!selectedGroup) return undefined;
      availableGroups = selectedGroup.groups;
    }

    return selectedGroup;
  };

  const selectedGroupDetails = findGroup(selectedGroupPath);

  const menuSpacingClass = {
    sm: "top-[26px]",
    md: "top-[32px]",
    lg: "top-[38px]",
  };

  const renderSelectedCount = (count?: number) =>
    count ? (
      <span className="min-w-5 rounded-full bg-light-300 px-1.5 py-0.5 text-center text-[10px] font-semibold leading-4 dark:bg-dark-400">
        {count}
      </span>
    ) : null;

  const renderMenuItems = (
    items: Item[],
    groupKey: string | null,
    close: () => void,
  ) => (
    <>
      {items.length > 0
        ? items.map((item) => (
            <Menu.Item key={item.key}>
              <div
                className="group flex items-center rounded-[5px] p-2 hover:bg-light-200 dark:hover:bg-dark-300"
                onClick={(e) => {
                  e.preventDefault();
                  handleSelect(groupKey, { key: item.key, value: item.value });
                  if (item.selected === undefined) {
                    setSelectedGroupPath([]);
                    close();
                  }
                }}
                onKeyDown={(event) => {
                  if (
                    item.selected !== undefined ||
                    (event.key !== "Enter" && event.key !== " ")
                  )
                    return;
                  event.preventDefault();
                  event.stopPropagation();
                  handleSelect(groupKey, {
                    key: item.key,
                    value: item.value,
                  });
                  setSelectedGroupPath([]);
                  close();
                }}
              >
                {item.selected !== undefined && (
                  <input
                    id={item.key}
                    name={item.key}
                    type="checkbox"
                    className="h-[14px] w-[14px] rounded bg-transparent"
                    onClick={(event) => event.stopPropagation()}
                    onChange={() =>
                      handleSelect(groupKey, {
                        key: item.key,
                        value: item.value,
                      })
                    }
                    checked={item.selected}
                  />
                )}
                {item.leftIcon && (
                  <span className="ml-3 flex items-center">
                    {item.leftIcon}
                  </span>
                )}
                {item.selected === undefined ? (
                  <span className="text-[12px] text-dark-900">
                    {item.value}
                  </span>
                ) : (
                  <label
                    htmlFor={item.key}
                    className="ml-3 text-[12px] text-dark-900"
                  >
                    {item.value}
                  </label>
                )}
                {handleEdit && (
                  <button
                    type="button"
                    className="invisible ml-auto group-hover:visible"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      handleEdit(item.key);
                    }}
                  >
                    <HiEllipsisHorizontal size={20} className="text-dark-900" />
                  </button>
                )}
              </div>
            </Menu.Item>
          ))
        : !handleCreate && (
            <div className="flex items-center p-2 text-[12px] text-dark-900">
              No items
            </div>
          )}
      {handleCreate && (
        <button
          type="button"
          className="flex w-full items-center rounded-[5px] p-2 px-2 text-[12px] text-dark-900 hover:bg-light-200 dark:hover:bg-dark-300"
          onClick={(e) => {
            e.preventDefault();
            handleCreate();
          }}
        >
          <HiMiniPlus size={20} className="pr-1.5" />
          {createNewItemLabel}
        </button>
      )}
    </>
  );

  const renderMenuGroups = (menuGroups: Group[]) =>
    menuGroups.map((group) => (
      <Menu.Item key={group.key}>
        <div
          className="flex items-center rounded-[5px] p-2 hover:bg-light-200 dark:hover:bg-dark-300"
          onClick={(event) => {
            event.preventDefault();
            setSelectedGroupPath([...selectedGroupPath, group.key]);
          }}
        >
          <span className="mr-2 text-dark-900">{group.icon}</span>
          <span className="pointer-events-none text-[12px] text-dark-900">
            {group.label}
          </span>
          <span className="ml-auto flex items-center gap-2 text-dark-900">
            {renderSelectedCount(group.selectedCount)}
            <HiChevronRight size={14} aria-hidden="true" />
          </span>
        </div>
      </Menu.Item>
    ));

  return (
    <Menu
      as="div"
      className="relative flex w-full flex-wrap items-center text-left"
    >
      {({ close }) => (
        <>
          <Menu.Button
            as={asChild ? "div" : undefined}
            disabled={disabled}
            aria-label={ariaLabel}
            className="h-full w-full cursor-pointer focus-visible:outline-none disabled:cursor-not-allowed"
          >
            {children}
          </Menu.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
            afterLeave={() => setSelectedGroupPath([])}
          >
            <Menu.Items
              className={twMerge(
                "mt-2s absolute z-50 w-56 origin-top-left rounded-md border-[1px] border-light-200 bg-light-50 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:border-dark-500 dark:bg-dark-200",
                position === "left" ? "left-0" : "right-0",
                menuSpacingClass[menuSpacing],
              )}
            >
              <div className="max-h-[350px] overflow-y-auto p-1">
                {selectedGroupPath.length === 0 ? (
                  <>
                    {items && renderMenuItems(items, null, close)}
                    {groups && renderMenuGroups(groups)}
                  </>
                ) : (
                  <>
                    <Menu.Item>
                      <button
                        type="button"
                        className="flex w-full items-center rounded-[5px] p-2 text-dark-900 hover:bg-light-200 dark:hover:bg-dark-300"
                        onClick={(event) => {
                          event.preventDefault();
                          setSelectedGroupPath((path) => path.slice(0, -1));
                        }}
                      >
                        <span className="sr-only">{backLabel}</span>
                        <HiChevronLeft size={14} aria-hidden="true" />
                        <span className="ml-2 text-[12px] font-semibold">
                          {selectedGroupDetails?.label}
                        </span>
                        <span className="ml-auto flex items-center">
                          {renderSelectedCount(
                            selectedGroupDetails?.selectedCount,
                          )}
                        </span>
                      </button>
                    </Menu.Item>
                    <div className="my-1 border-t border-light-200 dark:border-dark-500" />
                    {selectedGroupDetails?.items &&
                      renderMenuItems(
                        selectedGroupDetails.items,
                        selectedGroupDetails.key,
                        close,
                      )}
                    {selectedGroupDetails?.groups &&
                      renderMenuGroups(selectedGroupDetails.groups)}
                  </>
                )}
              </div>
              {footer && (
                <div className="border-t border-light-200 p-1 dark:border-dark-500">
                  <Menu.Item>{footer}</Menu.Item>
                </div>
              )}
            </Menu.Items>
          </Transition>
        </>
      )}
    </Menu>
  );
}
