import { Menu, Transition } from "@headlessui/react";
import { t } from "@lingui/core/macro";
import { Fragment } from "react";
import { HiCheck } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import { useModal } from "~/providers/modal";
import { useWorkspace } from "~/providers/workspace";

export default function WorkspaceMenu({
  isCollapsed = false,
}: {
  isCollapsed?: boolean;
}) {
  const { workspace, isLoading, availableWorkspaces, switchWorkspace } =
    useWorkspace();
  const { openModal } = useModal();

  return (
    <Menu as="div" className="relative inline-block w-full pb-3 text-left">
      <div>
        {isLoading ? (
          <div className={twMerge("mb-1 flex", isCollapsed && "md:p-1.5")}>
            <div className="h-6 w-6 animate-pulse rounded-md bg-light-200 dark:bg-dark-200" />
            <div
              className={twMerge(
                "ml-2 h-6 w-[150px] animate-pulse rounded-md bg-light-200 dark:bg-dark-200",
                isCollapsed && "md:hidden",
              )}
            />
          </div>
        ) : (
          <Menu.Button
            className={twMerge(
              "mb-1 flex h-[34px] w-full items-center rounded-md p-1.5 hover:bg-light-200 dark:hover:bg-dark-200",
              isCollapsed && "md:mb-1.5 md:h-9 md:p-1",
            )}
            title={isCollapsed ? workspace.name : undefined}
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-indigo-700">
              <span className="text-xs font-bold leading-none text-white">
                {workspace.name.charAt(0).toUpperCase()}
              </span>
            </span>
            <span
              className={twMerge(
                "ml-2 text-sm font-bold text-neutral-900 dark:text-dark-1000",
                isCollapsed && "md:hidden",
              )}
            >
              {workspace.name}
            </span>
            {workspace.plan === "pro" && (
              <span
                className={twMerge(
                  "ml-2 inline-flex items-center rounded-md bg-indigo-100 px-2 py-1 text-[10px] font-medium text-indigo-700",
                  isCollapsed && "md:hidden",
                )}
              >
                Pro
              </span>
            )}
          </Menu.Button>
        )}
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
        <Menu.Items
          className={twMerge(
            "absolute left-0 z-10 origin-top-left rounded-md border border-light-600 bg-light-50 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:border-dark-600 dark:bg-dark-300",
            isCollapsed ? "w-48" : "w-full",
          )}
        >
          <div className="p-1">
            {availableWorkspaces.map((availableWorkspace) => (
              <div key={availableWorkspace.publicId} className="flex">
                <Menu.Item>
                  <button
                    onClick={() => switchWorkspace(availableWorkspace)}
                    className="flex w-full items-center justify-between rounded-[5px] px-3 py-2 text-left text-sm text-neutral-900 hover:bg-light-200 dark:text-dark-1000 dark:hover:bg-dark-400"
                  >
                    <div>
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-[5px] bg-indigo-700">
                        <span className="text-xs font-medium leading-none text-white">
                          {availableWorkspace.name.charAt(0).toUpperCase()}
                        </span>
                      </span>
                      <span className="ml-2 text-xs font-medium">
                        {availableWorkspace.name}
                      </span>
                    </div>
                    {workspace.name === availableWorkspace.name && (
                      <span>
                        <HiCheck className="h-4 w-4" aria-hidden="true" />
                      </span>
                    )}
                  </button>
                </Menu.Item>
              </div>
            ))}
          </div>
          <div className="border-t-[1px] border-light-600 p-1 dark:border-dark-500">
            <Menu.Item>
              <button
                onClick={() => openModal("NEW_WORKSPACE")}
                className="flex w-full items-center justify-between rounded-[5px] px-3 py-2 text-left text-xs text-neutral-900 hover:bg-light-200 dark:text-dark-1000 dark:hover:bg-dark-400"
              >
                {t`Create workspace`}
              </button>
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
