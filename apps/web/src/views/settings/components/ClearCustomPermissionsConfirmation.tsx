import { t } from "@lingui/core/macro";

import Button from "~/components/Button";
import { useModal } from "~/providers/modal";
import { useWorkspace } from "~/providers/workspace";
import type { api } from "~/utils/api";

type ResetMutation = ReturnType<
  typeof api.permission.resetWorkspaceMemberPermissions.useMutation
>;

export function ClearCustomPermissionsConfirmation({
  resetAllOverrides,
}: {
  resetAllOverrides: ResetMutation;
}) {
  const { closeModal } = useModal();
  const { workspace } = useWorkspace();

  const handleConfirm = () => {
    if (!workspace.publicId || resetAllOverrides.isPending) return;
    resetAllOverrides.mutate({
      workspacePublicId: workspace.publicId,
    });
    closeModal();
  };

  return (
    <div className="p-5">
      <div className="flex w-full flex-col justify-between pb-4">
        <h2 className="text-md pb-4 font-medium text-neutral-900 dark:text-dark-1000">
          {t`Clear all custom permissions?`}
        </h2>
        <p className="mb-4 text-sm text-light-900 dark:text-dark-900">
          {t`This will remove all custom member permissions in this workspace. Members will inherit permissions only from their roles.`}
        </p>
      </div>
      <div className="mt-5 flex justify-end space-x-2 sm:mt-6">
        <Button size="sm" variant="secondary" onClick={() => closeModal()}>
          {t`Cancel`}
        </Button>
        <Button
          size="sm"
          variant="primary"
          onClick={handleConfirm}
          isLoading={resetAllOverrides.isPending}
        >
          {t`Clear custom permissions`}
        </Button>
      </div>
    </div>
  );
}


