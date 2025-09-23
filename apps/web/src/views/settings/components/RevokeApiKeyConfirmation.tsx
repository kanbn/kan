import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { authClient } from "@kan/auth/client";

import Button from "~/components/Button";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";

export function RevokeApiKeyConfirmation() {
  const { closeModal, entityId, entityLabel } = useModal();
  const { showPopup } = usePopup();
  const qc = useQueryClient();

  const [isAcknowledgmentChecked, setIsAcknowledgmentChecked] = useState(false);

  const deleteApiKeyMutation = useMutation({
    mutationFn: () => authClient.apiKey.delete({ keyId: entityId }),
    onSuccess: async () => {
      closeModal();
      showPopup({
        header: "API key revoked",
        message: `Your API key: ${entityLabel} has been revoked.`,
        icon: "success",
      });
      qc.invalidateQueries({
        queryKey: ["apiKeys"],
      });
    },
    onError: () => {
      closeModal();
      showPopup({
        header: "Error revoking API key",
        message: "Please try again later, or contact customer support.",
        icon: "error",
      });
    },
  });

  const handleRevokeApiKey = () => {
    deleteApiKeyMutation.mutate();
  };

  return (
    <div className="p-5">
      <div className="flex w-full flex-col justify-between pb-4">
        <h2 className="text-md pb-4 font-medium text-neutral-900 dark:text-dark-1000">
          {`Are you sure you want to revoke this API key: ${entityLabel}?`}
        </h2>
        <p className="mb-4 text-sm text-light-900 dark:text-dark-900">
          Keep in mind that this action is irreversible.
        </p>
        <p className="text-sm text-light-900 dark:text-dark-900">
          This will result in the permanent revocation of this API key.
        </p>
      </div>
      <div className="relative flex items-start">
        <div className="flex h-6 items-center">
          <input
            id="acknowledgment"
            name="acknowledgment"
            type="checkbox"
            aria-describedby="acknowledgment-description"
            className="mt-2 h-[14px] w-[14px] rounded border-gray-300 bg-transparent text-indigo-600 focus:shadow-none focus:ring-0 focus:ring-offset-0"
            checked={isAcknowledgmentChecked}
            onChange={() =>
              setIsAcknowledgmentChecked(!isAcknowledgmentChecked)
            }
          />
        </div>
        <div className="ml-3 text-sm leading-6">
          <p
            id="comments-description"
            className="text-light-900 dark:text-dark-1000"
          >
            I acknowledge that this API key will be permanently revoked and want
            to proceed.
          </p>
        </div>
      </div>
      <div className="mt-5 flex justify-end space-x-2 sm:mt-6">
        <Button variant="secondary" onClick={() => closeModal()}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={handleRevokeApiKey}
          disabled={!isAcknowledgmentChecked}
          isLoading={deleteApiKeyMutation.isPending}
        >
          Revoke API key
        </Button>
      </div>
    </div>
  );
}
