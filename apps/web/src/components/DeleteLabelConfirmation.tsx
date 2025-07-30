import Button from "~/components/Button";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

export function DeleteLabelConfirmation({
  labelPublicId,
  refetch,
}: {
  labelPublicId: string;
  refetch: () => void;
}) {
  const { closeModal, closeModals } = useModal();
  const { showPopup } = usePopup();

  const deleteLabelMutation = api.label.delete.useMutation({
    onSuccess: () => {
      refetch();
      closeModals(2);
    },
    onError: () =>
      showPopup({
        header: "Error deleting label",
        message: "Please try again later, or contact customer support.",
        icon: "error",
      }),
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
          Are you sure you want to delete this label?
        </h2>
        <p className="text-sm font-medium text-light-900 dark:text-dark-900">
          {"This action can't be undone."}
        </p>
      </div>
      <div className="mt-5 flex justify-end space-x-2 sm:mt-6">
        <Button variant="secondary" onClick={() => closeModal()}>
          Cancel
        </Button>
        <Button onClick={handleDeleteLabel}>Delete</Button>
      </div>
    </div>
  );
}
