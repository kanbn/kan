import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";

import {
  getGetWorkspaceQueryKey,
  useDeleteMember,
} from "@kan/api-client/hooks";

import Button from "~/components/Button";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";

export function DeleteMemberConfirmation() {
  const queryClient = useQueryClient();
  const { closeModal, entityLabel, entityId } = useModal();
  const { workspace } = useWorkspace();
  const { showPopup } = usePopup();

  const deleteMember = useDeleteMember({
    mutation: {
      onSuccess: async () => {
        closeModal();
        try {
          await queryClient.refetchQueries({
            queryKey: getGetWorkspaceQueryKey(workspace.publicId),
          });
        } catch (e) {
          console.error(e);
        }
      },
      onError: () => {
        showPopup({
          header: t`Unable to remove member`,
          message: t`Please try again later, or contact customer support.`,
          icon: "error",
        });
        closeModal();
      },
    },
  });

  const handleDeleteMember = () => {
    if (entityId)
      deleteMember.mutate({
        memberPublicId: entityId,
        workspacePublicId: workspace.publicId,
      });
  };

  return (
    <div className="p-5">
      <div className="flex w-full flex-col justify-between pb-4">
        <h2 className="text-md pb-4 font-medium text-neutral-900 dark:text-dark-1000">
          <Trans>Are you sure want to remove {entityLabel}?</Trans>
        </h2>
        <p className="text-sm font-medium text-light-900 dark:text-dark-900">
          {t`They won't be able to access this workspace.`}
        </p>
      </div>
      <div className="mt-5 flex justify-end space-x-2 sm:mt-6">
        <Button onClick={() => closeModal()} variant="secondary">
          {t`Cancel`}
        </Button>
        <Button onClick={handleDeleteMember} isLoading={deleteMember.isPending}>
          {t`Remove`}
        </Button>
      </div>
    </div>
  );
}
