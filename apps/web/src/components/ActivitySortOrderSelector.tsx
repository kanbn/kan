import { t } from "@lingui/core/macro";
import { HiOutlineBarsArrowDown } from "react-icons/hi2";

import type { ActivitySortOrder } from "~/hooks/useActivitySortOrder";
import {
  setActivitySortOrder,
  useActivitySortOrder,
} from "~/hooks/useActivitySortOrder";

const sortOrderOptions: {
  value: ActivitySortOrder;
  label: () => string;
}[] = [
  { value: "oldest", label: () => t`Oldest first` },
  { value: "newest", label: () => t`Newest first` },
];

export function ActivitySortOrderSelector() {
  const sortOrder = useActivitySortOrder();

  return (
    <div className="relative">
      <HiOutlineBarsArrowDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <select
        id="activity-sort-order-select"
        value={sortOrder}
        onChange={(event) =>
          setActivitySortOrder(event.target.value as ActivitySortOrder)
        }
        className="block w-full max-w-[180px] rounded-lg border-0 bg-light-50 pl-10 text-sm shadow-sm ring-1 ring-inset ring-light-300 focus:ring-2 focus:ring-inset focus:ring-light-400 dark:bg-dark-50 dark:text-dark-1000 dark:ring-dark-300 dark:focus:ring-dark-500"
      >
        {sortOrderOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label()}
          </option>
        ))}
      </select>
    </div>
  );
}
