import { useRouter } from "next/router";
import { Menu, Transition } from "@headlessui/react";
import { t } from "@lingui/core/macro";
import { Fragment } from "react";
import {
  HiOutlineBarsArrowDown,
  HiOutlineBarsArrowUp,
  HiOutlineCheck,
} from "react-icons/hi2";
import { IoSwapVerticalOutline } from "react-icons/io5";

import Button from "~/components/Button";

function sortLabel(value: SortValue): string {
  switch (value) {
    case "manual":
      return t`Manual`;
    case "updated-desc":
      return t`Last updated (newest)`;
    case "updated-asc":
      return t`Last updated (oldest)`;
    case "created-desc":
      return t`Created (newest)`;
    case "created-asc":
      return t`Created (oldest)`;
    case "title-asc":
      return t`Title (A–Z)`;
    case "title-desc":
      return t`Title (Z–A)`;
    case "dueDate-asc":
      return t`Due date (soonest)`;
    case "dueDate-desc":
      return t`Due date (latest)`;
  }
}

// Allowed sort values. "manual" = the board's natural drag order (default).
export const SORT_VALUES = [
  "manual",
  "updated-desc",
  "updated-asc",
  "created-desc",
  "created-asc",
  "title-asc",
  "title-desc",
  "dueDate-asc",
  "dueDate-desc",
] as const;

export type SortValue = (typeof SORT_VALUES)[number];

export const isSortValue = (value: unknown): value is SortValue =>
  typeof value === "string" &&
  (SORT_VALUES as readonly string[]).includes(value);

const Sort = ({ isLoading }: { isLoading: boolean }) => {
  const router = useRouter();
  const active = isSortValue(router.query.sort) ? router.query.sort : "manual";

  const selectSort = async (value: SortValue) => {
    try {
      const query = { ...router.query };
      if (value === "manual") {
        delete query.sort;
      } else {
        query.sort = value;
      }
      await router.push({ pathname: router.pathname, query });
    } catch (error) {
      console.error(error);
    }
  };

  const isAsc = active.endsWith("-asc");

  return (
    <Menu as="div" className="relative inline-block text-left">
      <Menu.Button
        as="div"
        disabled={isLoading}
        className="h-full w-full cursor-pointer focus-visible:outline-none disabled:cursor-not-allowed"
      >
        <Button
          variant="secondary"
          disabled={isLoading}
          iconLeft={<IoSwapVerticalOutline />}
          iconRight={
            active !== "manual" ? (
              isAsc ? (
                <HiOutlineBarsArrowUp className="h-4 w-4" />
              ) : (
                <HiOutlineBarsArrowDown className="h-4 w-4" />
              )
            ) : undefined
          }
        >
          {t`Sort`}
        </Button>
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 isolate z-[100] mt-2 w-56 origin-top-right rounded-md border border-light-200 bg-white p-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:border-dark-400 dark:bg-dark-300">
          <div className="flex flex-col">
            {SORT_VALUES.map((value) => (
              <Menu.Item key={value}>
                <button
                  type="button"
                  onClick={() => selectSort(value)}
                  className="flex w-auto items-center gap-2 rounded-[5px] px-2.5 py-1.5 text-left text-sm text-neutral-900 hover:bg-light-200 dark:text-dark-950 dark:hover:bg-dark-400"
                >
                  {active === value ? (
                    <HiOutlineCheck className="h-4 w-4" />
                  ) : (
                    <span className="h-4 w-4" />
                  )}
                  {sortLabel(value)}
                </button>
              </Menu.Item>
            ))}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};

export default Sort;
// The card that blocks it (the prerequisite)
