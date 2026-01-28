import { t } from "@lingui/core/macro";
import { useEffect, useState } from "react";

import Toggle from "~/components/Toggle";
import { api } from "~/utils/api";

export default function UpdateWorkspaceEmailVisibilityForm({
  workspacePublicId,
  showEmailsToMembers,
}: {
  workspacePublicId: string;
  showEmailsToMembers: boolean;
}) {
  const utils = api.useUtils();
  const [isChecked, setIsChecked] = useState(showEmailsToMembers);

  useEffect(() => {
    setIsChecked(showEmailsToMembers);
  }, [showEmailsToMembers]);

  const updateWorkspace = api.workspace.update.useMutation({
    onSuccess: () => {
      void utils.workspace.byId.invalidate({
        workspacePublicId,
      });
    },
  });

  const handleToggle = () => {
    const newValue = !isChecked;
    setIsChecked(newValue);
    updateWorkspace.mutate({
      workspacePublicId,
      showEmailsToMembers: newValue,
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
        disabled={updateWorkspace.isPending}
      />
    </div>
  );
}
