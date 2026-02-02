import { Menu, Transition } from "@headlessui/react";
import { Fragment } from "react";

export default function Dropdown({
  items,
  children,
  disabled,
}: {
  items: { label: string; action?: () => void; icon?: React.ReactNode; disabled?: boolean }[];
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button
          disabled={disabled}
          className="flex h-7 w-7 items-center justify-center rounded-[5px] hover:bg-light-200 focus:outline-none dark:hover:bg-dark-200"
        >
          {children}
        </Menu.Button>
      </div>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 z-[100] isolate mt-2 w-56 origin-top-right rounded-md border border-light-200 bg-white p-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:border-dark-400 dark:bg-dark-300">
          <div className="flex flex-col">
            {items.map((item) => (
              <Menu.Item key={item.label} disabled={item.disabled}>
                <button
                  onClick={item.action}
                  disabled={item.disabled ?? !item.action}
                  className="flex w-auto items-center gap-2 rounded-[5px] px-2.5 py-1.5 text-left text-sm text-neutral-900 hover:bg-light-200 disabled:cursor-not-allowed disabled:opacity-60 dark:text-dark-950 dark:hover:bg-dark-400"
                >
                  {item.icon}
                  {item.label}
                </button>
              </Menu.Item>
            ))}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
