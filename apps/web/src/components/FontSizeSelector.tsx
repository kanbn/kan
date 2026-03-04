import { t } from "@lingui/core/macro";
import { HiOutlineAdjustmentsHorizontal } from "react-icons/hi2";

import { useFontSize, type FontSize } from "~/providers/font-size";

const fontSizeOptions: { value: FontSize; label: () => string }[] = [
  { value: "small", label: () => t`Small` },
  { value: "medium", label: () => t`Medium` },
  { value: "large", label: () => t`Large` },
];

export function FontSizeSelector() {
  const { fontSize, setFontSize } = useFontSize();

  return (
    <div className="relative">
      <HiOutlineAdjustmentsHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <select
        id="font-size-select"
        value={fontSize}
        onChange={(e) => setFontSize(e.target.value as FontSize)}
        className="mt-8 block w-full max-w-[180px] rounded-lg border-0 bg-light-50 pl-10 text-sm shadow-sm ring-1 ring-inset ring-light-300 focus:ring-2 focus:ring-inset focus:ring-light-400 dark:bg-dark-50 dark:text-dark-1000 dark:ring-dark-300 dark:focus:ring-dark-500"
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
