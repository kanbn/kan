import { t } from "@lingui/core/macro";
import { useQueryClient } from "@tanstack/react-query";
import { HiXMark } from "react-icons/hi2";

import {
  getGetWebhooksQueryKey,
  useDeleteWebhook,
} from "@kan/api-client/hooks";

import Button from "~/components/Button";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";

interface DeleteWebhookConfirmationProps {
  workspacePublicId: string;
}

export function DeleteWebhookConfirmation({
  workspacePublicId,
}: DeleteWebhookConfirmationProps) {
  const {
    closeModal,
    entityId: webhookPublicId,
    entityLabel: webhookName,
  } = useModal();
  const { showPopup } = usePopup();
  const queryClient = useQueryClient();

  const deleteWebhookMutation = useDeleteWebhook({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getGetWebhooksQueryKey(workspacePublicId),
        });
        showPopup({
          header: t`Webhook deleted`,
          message: t`Webhook deleted successfully`,
          icon: "success",
        });
        closeModal();
      },
      onError: (error) => {
        showPopup({
          header: t`Unable to delete webhook`,
          message:
            (error instanceof Error && error.message) ||
            t`Failed to delete webhook`,
          icon: "error",
        });
      },
    },
  });

  const handleDelete = () => {
    if (!webhookPublicId) return;
    deleteWebhookMutation.mutate({
      workspacePublicId,
      webhookPublicId: webhookPublicId,
    });
  };

  return (
    <div>
      <div className="px-5 pt-5">
        <div className="flex w-full items-center justify-between pb-4 text-neutral-900 dark:text-dark-1000">
          <h2 className="text-sm font-bold">{t`Delete webhook`}</h2>
          <button
            type="button"
            className="rounded-sm p-1 hover:bg-light-300 focus:outline-hidden dark:hover:bg-dark-300"
            onClick={(e) => {
              e.preventDefault();
              closeModal();
            }}
          >
            <HiXMark size={18} className="text-light-900 dark:text-dark-900" />
          </button>
        </div>

        <p className="text-sm text-neutral-500 dark:text-dark-900">
          {t`Are you sure you want to delete the webhook "${webhookName}"? This action cannot be undone.`}
        </p>
      </div>

      <div className="mt-8 flex items-center justify-end gap-3 border-t border-light-600 px-5 pt-5 pb-5 dark:border-dark-600">
        <Button variant="secondary" onClick={() => closeModal()}>
          {t`Cancel`}
        </Button>
        <Button
          variant="danger"
          onClick={handleDelete}
          isLoading={deleteWebhookMutation.isPending}
        >
          {t`Delete`}
        </Button>
      </div>
    </div>
  );
}
