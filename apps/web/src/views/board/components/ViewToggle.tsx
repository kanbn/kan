import { t } from "@lingui/core/macro";
import { HiCalendarDays, HiOutlineViewColumns } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

export type BoardView = "board" | "calendar";

interface ViewToggleProps {
  view: BoardView;
  onChange: (view: BoardView) => void;
}

const ViewToggle = ({ view, onChange }: ViewToggleProps) => {
  const baseButtonClasses =
    "flex items-center gap-1.5 rounded-[5px] px-2.5 py-1.5 text-sm font-semibold transition-colors sm:px-3";
  const activeClasses =
    "bg-light-200 text-light-1000 dark:bg-dark-300 dark:text-dark-1000";
  const inactiveClasses =
    "text-light-900 hover:text-light-1000 dark:text-dark-900 dark:hover:text-dark-1000";

  return (
    <div className="flex items-center gap-0.5 rounded-md border-[1px] border-light-600 bg-light-50 p-0.5 dark:border-dark-600 dark:bg-dark-50">
      <button
        type="button"
        onClick={() => onChange("board")}
        className={twMerge(
          baseButtonClasses,
          view === "board" ? activeClasses : inactiveClasses,
        )}
      >
        <HiOutlineViewColumns className="h-4 w-4" />
        <span className="hidden sm:inline">{t`Lists`}</span>
      </button>
      <button
        type="button"
        onClick={() => onChange("calendar")}
        className={twMerge(
          baseButtonClasses,
          view === "calendar" ? activeClasses : inactiveClasses,
        )}
      >
        <HiCalendarDays className="h-4 w-4" />
        <span className="hidden sm:inline">{t`Calendar`}</span>
      </button>
    </div>
  );
};

export default ViewToggle;
