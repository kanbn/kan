import { t } from "@lingui/core/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import {
  getGetWorkspaceQueryKey,
  useUpdateWorkspace,
} from "@kan/api-client/hooks";

import Toggle from "~/components/Toggle";

export default function UpdateWorkspaceEmailVisibilityForm({
  workspacePublicId,
  showEmailsToMembers,
  disabled = false,
}: {
  workspacePublicId: string;
  showEmailsToMembers: boolean;
  disabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const [isChecked, setIsChecked] = useState(showEmailsToMembers);

  useEffect(() => {
    setIsChecked(showEmailsToMembers);
  }, [showEmailsToMembers]);

  const updateWorkspace = useUpdateWorkspace({
    mutation: {
      onSuccess: () => {
        if (workspacePublicId && workspacePublicId.length >= 12) {
          void queryClient.invalidateQueries({
            queryKey: getGetWorkspaceQueryKey(workspacePublicId),
          });
        }
      },
    },
  });

  const handleToggle = () => {
    if (disabled) return;
    const newValue = !isChecked;
    setIsChecked(newValue);
    updateWorkspace.mutate({
      workspacePublicId,
      data: { showEmailsToMembers: newValue },
    });
  };

  return (
    <div className="mb-8 flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm text-neutral-500 dark:text-dark-900">
          {t`Allow workspace members to see each other's email addresses`}
        </p>
      </div>
      <Toggle
        isChecked={isChecked}
        onChange={handleToggle}
        label=""
        disabled={disabled || updateWorkspace.isPending}
      />
    </div>
  );
}
