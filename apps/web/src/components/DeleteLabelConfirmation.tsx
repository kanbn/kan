import { t } from "@lingui/core/macro";

import { useDeleteLabel } from "@kan/api-client/hooks";

import Button from "~/components/Button";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";

export function DeleteLabelConfirmation({
  labelPublicId,
  refetch,
}: {
  labelPublicId: string;
  refetch: () => void;
}) {
  const { closeModal, closeModals } = useModal();
  const { showPopup } = usePopup();

  const deleteLabelMutation = useDeleteLabel({
    mutation: {
      onSuccess: () => {
        refetch();
        closeModals(2);
      },
      onError: () =>
        showPopup({
          header: t`Error deleting label`,
          message: t`Please try again later, or contact customer support.`,
          icon: "error",
        }),
    },
  });

  const handleDeleteLabel = () => {
    deleteLabelMutation.mutate({
      labelPublicId,
    });
  };

  return (
    <div className="p-5">
      <div className="flex w-full flex-col justify-between pb-4">
        <h2 className="text-md pb-4 font-medium text-neutral-900 dark:text-dark-1000">
          {t`Are you sure you want to delete this label?`}
        </h2>
        <p className="text-sm font-medium text-light-900 dark:text-dark-900">
          {t`This action can't be undone.`}
        </p>
      </div>
      <div className="mt-5 flex justify-end space-x-2 sm:mt-6">
        <Button variant="secondary" onClick={() => closeModal()}>
          {t`Cancel`}
        </Button>
        <Button onClick={handleDeleteLabel}>{t`Delete`}</Button>
      </div>
    </div>
  );
}
