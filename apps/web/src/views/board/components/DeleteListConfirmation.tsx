import Button from "~/components/Button";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

interface DeleteListConfirmationProps {
  listPublicId: string;
  queryParams: QueryParams;
}

interface QueryParams {
  boardPublicId: string;
  members: string[];
  labels: string[];
  lists: string[];
}

export function DeleteListConfirmation({
  listPublicId,
  queryParams,
}: DeleteListConfirmationProps) {
  const utils = api.useUtils();
  const { closeModal } = useModal();
  const { showPopup } = usePopup();

  const deleteList = api.list.delete.useMutation({
    onError: () => {
      showPopup({
        header: "Unable to delete list",
        message: "Please try again later, or contact customer support.",
        icon: "error",
      });
    },
    onSettled: async () => {
      closeModal();
      await utils.board.byId.invalidate(queryParams);
    },
  });

  return (
    <div className="p-5">
      <div className="flex w-full flex-col justify-between pb-4">
        <h2 className="text-md pb-4 font-medium text-neutral-900 dark:text-dark-1000">
          Are you sure you want to delete this list?
        </h2>
        <p className="text-sm font-medium text-light-900 dark:text-dark-900">
          {"This action can't be undone."}
        </p>
      </div>
      <div className="mt-5 flex justify-end space-x-2 sm:mt-6">
        <Button onClick={() => closeModal()} variant="secondary">
          Cancel
        </Button>
        <Button
          isLoading={deleteList.isPending}
          onClick={() => deleteList.mutate({ listPublicId })}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
