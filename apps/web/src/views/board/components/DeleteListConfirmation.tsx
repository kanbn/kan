import { useDeleteList } from "@kan/api-client/hooks";

import Button from "~/components/Button";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useBoardCache } from "~/utils/boardCache";

interface DeleteListConfirmationProps {
  listPublicId: string;
  queryParams: QueryParams;
}

interface QueryParams {
  boardPublicId: string;
  members: string[];
  labels: string[];
  lists: string[];
  cardView: "summary";
}

export function DeleteListConfirmation({
  listPublicId,
  queryParams,
}: DeleteListConfirmationProps) {
  const boardCache = useBoardCache();
  const { closeModal } = useModal();
  const { showPopup } = usePopup();

  const deleteList = useDeleteList({
    mutation: {
      onError: () => {
        showPopup({
          header: "Unable to delete list",
          message: "Please try again later, or contact customer support.",
          icon: "error",
        });
      },
      onSettled: async () => {
        closeModal();
        await boardCache.invalidate(queryParams.boardPublicId);
      },
    },
  });

  return (
    <div className="p-5">
      <div className="flex w-full flex-col justify-between">
        <h2 className="pb-2 text-sm font-semibold text-neutral-900 dark:text-dark-1000">
          Are you sure you want to delete this list?
        </h2>
        <p className="text-sm text-light-900 dark:text-dark-900">
          {"This action can't be undone."}
        </p>
      </div>
      <div className="mt-5 flex justify-end space-x-2">
        <Button size="sm" onClick={() => closeModal()} variant="secondary">
          Cancel
        </Button>
        <Button
          size="sm"
          isLoading={deleteList.isPending}
          onClick={() => deleteList.mutate({ listPublicId })}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
