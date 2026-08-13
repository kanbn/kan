import { Menu, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { HiEllipsisVertical } from "react-icons/hi2";

export default function MemberDropdown() {
  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-transparent text-dark-900 focus:outline-none"
        >
          <span className="sr-only">Open options</span>
          <HiEllipsisVertical className="h-5 w-5" aria-hidden="true" />
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
        <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md border border-dark-400 bg-dark-200 shadow-sm ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="flex flex-col">
            <Menu.Item>
              <button
                // onClick={}
                className="m-1 flex items-center rounded-[5px] px-3 py-2 text-left text-xs text-dark-1000 hover:bg-dark-400"
              >
                Remove
              </button>
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
