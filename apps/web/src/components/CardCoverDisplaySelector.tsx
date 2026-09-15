import { t } from "@lingui/core/macro";
import { HiOutlinePhoto } from "react-icons/hi2";

import type { CardCoverDisplay } from "~/utils/cardCoverDisplay";
import { useCardCoverDisplay } from "~/providers/card-cover-display";
import { parseCardCoverDisplay } from "~/utils/cardCoverDisplay";

const displayOptions: {
  value: CardCoverDisplay;
  label: () => string;
}[] = [
  { value: "prominent", label: () => t`Prominent` },
  { value: "subdued", label: () => t`Subdued` },
  { value: "hidden", label: () => t`Hidden` },
];

export function CardCoverDisplaySelector() {
  const { display, isReady, setDisplay } = useCardCoverDisplay();

  return (
    <div className="relative">
      <HiOutlinePhoto className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <select
        id="card-cover-display-select"
        value={display}
        disabled={!isReady}
        onChange={(event) =>
          setDisplay(parseCardCoverDisplay(event.target.value))
        }
        className="block w-full max-w-[180px] rounded-lg border-0 bg-light-50 pl-10 text-sm shadow-sm ring-1 ring-inset ring-light-300 focus:ring-2 focus:ring-inset focus:ring-light-400 dark:bg-dark-50 dark:text-dark-1000 dark:ring-dark-300 dark:focus:ring-dark-500"
      >
        {displayOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label()}
          </option>
        ))}
      </select>
    </div>
  );
}
