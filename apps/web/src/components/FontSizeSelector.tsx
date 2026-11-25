import { t } from "@lingui/core/macro";
import { HiOutlineAdjustmentsHorizontal } from "react-icons/hi2";

import type { FontSize } from "~/providers/font-size";
import { useFontSize } from "~/providers/font-size";

const fontSizeOptions: { value: FontSize; label: () => string }[] = [
  { value: "small", label: () => t`Small` },
  { value: "medium", label: () => t`Medium` },
  { value: "large", label: () => t`Large` },
];

export function FontSizeSelector() {
  const { fontSize, setFontSize } = useFontSize();

  return (
    <div className="relative">
      <HiOutlineAdjustmentsHorizontal className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <select
        id="font-size-select"
        value={fontSize}
        onChange={(e) => setFontSize(e.target.value as FontSize)}
        className="block w-full rounded-md border-0 bg-light-50 py-1.5 pl-9 text-sm ring-1 ring-light-600 ring-inset focus:ring-2 focus:ring-light-700 focus:ring-inset sm:w-[180px] dark:bg-dark-50 dark:text-dark-1000 dark:ring-dark-600 dark:focus:ring-dark-700"
      >
        {fontSizeOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label()}
          </option>
        ))}
      </select>
    </div>
  );
}
