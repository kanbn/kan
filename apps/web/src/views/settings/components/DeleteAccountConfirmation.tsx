import { useRouter } from "next/navigation";
import { t } from "@lingui/core/macro";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { authClient } from "@kan/auth/client";

import Button from "~/components/Button";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";

export function DeleteAccountConfirmation() {
  const { closeModal } = useModal();
  const { showPopup } = usePopup();
  const router = useRouter();

  const queryClient = useQueryClient();

  const [isAcknowledgmentChecked, setIsAcknowledgmentChecked] = useState(false);

  const deleteAccountMutation = useMutation({
    mutationFn: () => authClient.deleteUser(),
    onSuccess: () => {
      closeModal();
      showPopup({
        header: t`Account deleted`,
        message: t`Your account has been deleted.`,
        icon: "success",
      });

      void queryClient.invalidateQueries();

      router.push("/");
    },
    onError: () => {
      closeModal();
      showPopup({
        header: t`Error deleting account`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
  });

  const handleDeleteAccount = () => {
    deleteAccountMutation.mutate();
  };

  return (
    <div className="p-5">
      <div className="flex w-full flex-col justify-between pb-4">
        <h2 className="text-md pb-4 font-medium text-neutral-900 dark:text-dark-1000">
          {t`Are you sure you want to delete your account?`}
        </h2>
        <p className="mb-4 text-sm text-light-900 dark:text-dark-900">
          {t`Keep in mind that this action is irreversible.`}
        </p>
        <p className="text-sm text-light-900 dark:text-dark-900">
          {t`This will result in the permanent deletion of all data associated with your account.`}
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
            {t`I acknowledge that all of my account data will be permanently deleted and want to proceed.`}
          </p>
        </div>
      </div>
      <div className="mt-5 flex justify-end space-x-2 sm:mt-6">
        <Button variant="secondary" onClick={() => closeModal()}>
          {t`Cancel`}
        </Button>
        <Button
          variant="danger"
          onClick={handleDeleteAccount}
          disabled={!isAcknowledgmentChecked}
          isLoading={deleteAccountMutation.isPending}
        >
          {t`Delete account`}
        </Button>
      </div>
    </div>
  );
}
