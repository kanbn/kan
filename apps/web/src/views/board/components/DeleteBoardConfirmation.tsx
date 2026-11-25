import { useRouter } from "next/navigation";
import { t } from "@lingui/core/macro";

import { useDeleteBoard } from "@kan/api-client/hooks";

import Button from "~/components/Button";
import { useModal } from "~/providers/modal";

export function DeleteBoardConfirmation({
  boardPublicId,
  isTemplate,
}: {
  boardPublicId: string;
  isTemplate: boolean;
}) {
  const router = useRouter();
  const { closeModal } = useModal();

  const deleteBoard = useDeleteBoard({
    mutation: {
      onSuccess: () => {
        closeModal();
        router.push(isTemplate ? `/templates` : `/boards`);
      },
    },
  });

  const handleDeleteBoard = () => {
    if (boardPublicId) deleteBoard.mutate({ boardPublicId });
  };

  return (
    <div className="p-5">
      <div className="flex w-full flex-col justify-between">
        <h2 className="pb-2 text-sm font-semibold text-neutral-900 dark:text-dark-1000">
          {t`Are you sure you want to delete this ${isTemplate ? "template" : "board"}?`}
        </h2>
        <p className="text-sm text-light-900 dark:text-dark-900">
          {t`This action can't be undone.`}
        </p>
      </div>
      <div className="mt-5 flex justify-end space-x-2">
        <Button size="sm" onClick={() => closeModal()} variant="secondary">
          {t`Cancel`}
        </Button>
        <Button
          size="sm"
          onClick={handleDeleteBoard}
          isLoading={deleteBoard.isPending}
        >
          {t`Delete`}
        </Button>
      </div>
    </div>
  );
}
