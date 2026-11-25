import { t } from "@lingui/core/macro";

import DateSelector from "~/components/DateSelector";
import { useModal } from "~/providers/modal";

export function CardDueDateModal({
  dueDate,
  weekStartsOn,
  onSelect,
}: {
  dueDate: string | null | undefined;
  weekStartsOn: 0 | 1 | 6;
  onSelect: (date: Date | null) => void;
}) {
  const { closeModal } = useModal();

  return (
    <div className="flex flex-col items-center p-4">
      <h2 className="w-full text-sm font-semibold text-neutral-900 dark:text-dark-1000">
        {t`Set due date`}
      </h2>
      <DateSelector
        selectedDate={dueDate ? new Date(dueDate) : null}
        weekStartsOn={weekStartsOn}
        onDateSelect={(date) => {
          onSelect(date ?? null);
          closeModal();
        }}
      />
    </div>
  );
}
