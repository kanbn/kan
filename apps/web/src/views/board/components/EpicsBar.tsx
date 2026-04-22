import { t } from "@lingui/core/macro";
import { useState } from "react";
import { HiChevronDown, HiChevronUp } from "react-icons/hi2";

import { api } from "~/utils/api";

interface EpicsBarProps {
  boardPublicId: string;
}

const EpicsBar = ({ boardPublicId }: EpicsBarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const { data: epics } = api.card.getEpics.useQuery(
    { boardPublicId },
    { enabled: !!boardPublicId },
  );

  if (!epics || epics.length === 0) return null;

  return (
    <div className="z-10 mx-6 mb-2 md:mx-8">
      <div className="rounded-md border border-light-200 bg-light-50 dark:border-dark-200 dark:bg-dark-100">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-light-900 hover:text-light-1000 dark:text-dark-900 dark:hover:text-dark-1000"
        >
          <span>{t`Epics`} ({epics.length})</span>
          {isCollapsed ? (
            <HiChevronDown className="h-3.5 w-3.5" />
          ) : (
            <HiChevronUp className="h-3.5 w-3.5" />
          )}
        </button>
        {!isCollapsed && (
          <div className="flex gap-3 overflow-x-auto px-3 pb-3">
            {epics.map((epic) => {
              const progress =
                epic.totalChildren > 0
                  ? Math.round(
                      (epic.doneChildren / epic.totalChildren) * 100,
                    )
                  : 0;

              return (
                <div
                  key={epic.publicId}
                  className="flex min-w-[180px] flex-col gap-1.5 rounded-md border border-light-200 bg-white px-3 py-2 dark:border-dark-300 dark:bg-dark-200"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-medium text-neutral-900 dark:text-dark-1000">
                      {epic.title}
                    </span>
                    <span className="flex-shrink-0 rounded-full bg-light-200 px-1.5 py-0.5 text-[10px] font-medium text-light-900 dark:bg-dark-400 dark:text-dark-950">
                      {epic.doneChildren}/{epic.totalChildren}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-light-200 dark:bg-dark-400">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        progress === 100
                          ? "bg-green-500"
                          : "bg-blue-500"
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-light-700 dark:text-dark-800">
                    {epic.listName}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default EpicsBar;
