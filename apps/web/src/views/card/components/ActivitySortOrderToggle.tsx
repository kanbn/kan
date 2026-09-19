import { t } from "@lingui/core/macro";
import { HiOutlineBarsArrowDown, HiOutlineBarsArrowUp } from "react-icons/hi2";

import type { ActivitySortOrder } from "~/hooks/useActivitySortOrder";
import { Tooltip } from "~/components/Tooltip";

export const ActivitySortOrderToggle = ({
  order,
  onChange,
}: {
  order: ActivitySortOrder;
  onChange: (order: ActivitySortOrder) => void;
}) => {
  const isNewestFirst = order === "newest";
  const label = isNewestFirst
    ? t`Show oldest activity first`
    : t`Show newest activity first`;

  return (
    <Tooltip content={label} placement="top">
      <button
        type="button"
        aria-label={label}
        aria-pressed={isNewestFirst}
        onClick={() => onChange(isNewestFirst ? "oldest" : "newest")}
        className={`rounded p-1.5 text-light-900 transition-colors hover:bg-light-200 hover:text-light-1000 focus:outline-none focus-visible:ring-2 focus-visible:ring-light-400 dark:text-dark-800 dark:hover:bg-dark-200 dark:hover:text-dark-1000 dark:focus-visible:ring-dark-500 ${
          isNewestFirst
            ? "bg-light-200 text-light-1000 dark:bg-dark-200 dark:text-dark-1000"
            : ""
        }`}
      >
        {isNewestFirst ? (
          <HiOutlineBarsArrowUp className="h-5 w-5" />
        ) : (
          <HiOutlineBarsArrowDown className="h-5 w-5" />
        )}
      </button>
    </Tooltip>
  );
};
