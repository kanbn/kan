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
    <Toggle
      isChecked={isChecked}
      onChange={handleToggle}
      label={t`Email visibility`}
      showLabel={false}
      disabled={disabled || updateWorkspace.isPending}
    />
  );
}
