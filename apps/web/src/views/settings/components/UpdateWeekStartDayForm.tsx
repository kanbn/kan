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
    <div className="flex gap-2">
      <div className="mb-4 flex w-full max-w-[325px] items-center gap-2">
        <select
          value={value}
          onChange={handleChange}
          disabled={disabled || updateWorkspace.isPending}
          className="block w-full rounded-md border-0 bg-dark-300 bg-white/5 py-1.5 text-sm shadow-sm ring-1 ring-inset ring-light-600 placeholder:text-dark-800 focus:ring-2 focus:ring-inset focus:ring-light-700 dark:text-dark-1000 dark:ring-dark-700 dark:focus:ring-dark-700 sm:leading-6"
        >
          <option value={0}>{t`Sunday`}</option>
          <option value={1}>{t`Monday`}</option>
          <option value={6}>{t`Saturday`}</option>
        </select>
      </div>
    </div>
  );
}
