import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";

import {
  getGetBoardMembersQueryKey,
  useRemoveBoardMember,
} from "@kan/api-client/hooks";

import Button from "~/components/Button";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";

export function RemoveBoardMemberConfirmation({
  boardPublicId,
}: {
  boardPublicId: string;
}) {
  const { closeModal, entityId, entityLabel } = useModal();
  const { showPopup } = usePopup();
  const queryClient = useQueryClient();

  const removeMember = useRemoveBoardMember({
    mutation: {
      onSuccess: async () => {
        closeModal();
        await queryClient.invalidateQueries({
          queryKey: getGetBoardMembersQueryKey(boardPublicId),
        });
      },
      onError: (error) => {
        showPopup({
          header: t`Unable to remove member`,
          message:
            error instanceof Error
              ? error.message
              : t`Please try again later, or contact customer support.`,
          icon: "error",
        });
        closeModal();
      },
    },
  });

  const handleRemove = () => {
    if (!entityId) return;

    removeMember.mutate({
      boardPublicId,
      workspaceMemberPublicId: entityId,
    });
  };

  return (
    <div className="p-5">
      <div className="flex w-full flex-col justify-between pb-4">
        <h2 className="text-md pb-4 font-medium text-neutral-900 dark:text-dark-1000">
          <Trans>Are you sure you want to remove {entityLabel}?</Trans>
        </h2>
        <p className="text-sm font-medium text-light-900 dark:text-dark-900">
          {t`They'll lose access to this board, but will remain a member of the workspace.`}
        </p>
      </div>
      <div className="mt-5 flex justify-end space-x-2 sm:mt-6">
        <Button onClick={() => closeModal()} variant="secondary">
          {t`Cancel`}
        </Button>
        <Button onClick={handleRemove} isLoading={removeMember.isPending}>
          {t`Remove`}
        </Button>
      </div>
    </div>
  );
}
