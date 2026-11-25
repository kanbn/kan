import { t } from "@lingui/core/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import {
  getGetWorkspaceQueryKey,
  getGetWorkspacesQueryKey,
  useUpdateWorkspace,
} from "@kan/api-client/hooks";

export default function UpdateWeekStartDayForm({
  workspacePublicId,
  weekStartDay,
  disabled = false,
}: {
  workspacePublicId: string;
  weekStartDay: number;
  disabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(weekStartDay);

  useEffect(() => {
    setValue(weekStartDay);
  }, [weekStartDay]);

  const updateWorkspace = useUpdateWorkspace({
    mutation: {
      onSuccess: () => {
        if (workspacePublicId && workspacePublicId.length >= 12) {
          void queryClient.invalidateQueries({
            queryKey: getGetWorkspaceQueryKey(workspacePublicId),
          });
          void queryClient.invalidateQueries({
            queryKey: getGetWorkspacesQueryKey(),
          });
        }
      },
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (disabled) return;
    const newValue = Number(e.target.value);
    setValue(newValue);
    updateWorkspace.mutate({
      workspacePublicId,
      data: { weekStartDay: newValue as 0 | 1 | 6 },
    });
  };

  return (
    <select
      value={value}
      onChange={handleChange}
      disabled={disabled || updateWorkspace.isPending}
      aria-label={t`Week start day`}
      className="block w-full rounded-md border-0 bg-transparent py-1.5 text-sm ring-1 ring-light-600 ring-inset focus:ring-2 focus:ring-light-700 focus:ring-inset sm:w-[180px] dark:text-dark-1000 dark:ring-dark-600 dark:focus:ring-dark-700 [&>option]:bg-light-50 dark:[&>option]:bg-dark-200"
    >
      <option value={0}>{t`Sunday`}</option>
      <option value={1}>{t`Monday`}</option>
      <option value={6}>{t`Saturday`}</option>
    </select>
  );
}
