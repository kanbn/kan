import { t } from "@lingui/core/macro";
import { HiXMark } from "react-icons/hi2";

import Button from "~/components/Button";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

interface DeleteWebhookConfirmationProps {
  workspacePublicId: string;
}

export function DeleteWebhookConfirmation({
  workspacePublicId,
}: DeleteWebhookConfirmationProps) {
  const { closeModal, entityId: webhookPublicId, entityLabel: webhookName } = useModal();
  const { showPopup } = usePopup();
  const utils = api.useUtils();

  const deleteWebhookMutation = api.webhook.delete.useMutation({
    onSuccess: () => {
      void utils.webhook.list.invalidate({ workspacePublicId });
      showPopup({ message: t`Webhook deleted successfully`, type: "success" });
      closeModal();
    },
    onError: (error) => {
      showPopup({
        message: error.message || t`Failed to delete webhook`,
        type: "error",
      });
    },
  });

  const handleDelete = () => {
    if (!webhookPublicId) return;
    deleteWebhookMutation.mutate({
      workspacePublicId,
      webhookPublicId: webhookPublicId as string,
    });
  };

  return (
    <div>
      <div className="px-5 pt-5">
        <div className="flex w-full items-center justify-between pb-4 text-neutral-900 dark:text-dark-1000">
          <h2 className="text-sm font-bold">{t`Delete webhook`}</h2>
          <button
            type="button"
            className="rounded p-1 hover:bg-light-300 focus:outline-none dark:hover:bg-dark-300"
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

      <div className="mt-8 flex items-center justify-end gap-3 border-t border-light-600 px-5 pb-5 pt-5 dark:border-dark-600">
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
