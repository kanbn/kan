import { useRouter } from "next/navigation";
import { useState } from "react";

import Button from "~/components/Button";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";

export function DeleteWorkspaceConfirmation() {
  const { closeModal } = useModal();
  const { workspace, switchWorkspace, availableWorkspaces } = useWorkspace();
  const { showPopup } = usePopup();
  const router = useRouter();

  const [isAcknowledgmentChecked, setIsAcknowledgmentChecked] = useState(false);

  const utils = api.useUtils();

  const deleteWorkspaceMutation = api.workspace.delete.useMutation({
    onSuccess: () => {
      closeModal();
      showPopup({
        header: "Workspace deleted",
        message: "Your workspace has been deleted.",
        icon: "success",
      });

      utils.workspace.all.invalidate();
      
      const filteredWorkspaces = availableWorkspaces.filter(
        (ws) => ws.publicId !== workspace.publicId,
      );
      if (filteredWorkspaces.length > 0 && filteredWorkspaces[0]) {
        switchWorkspace(filteredWorkspaces[0]);
      } else {
        router.push("/");
      }
    },
    onError: () => {
      closeModal();
      showPopup({
        header: "Error deleting workspace",
        message: "Please try again later, or contact customer support.",
        icon: "error",
      });
    },
  });

  const handleDeleteWorkspace = () => {
    deleteWorkspaceMutation.mutate({
      workspacePublicId: workspace.publicId,
    });
  };

  return (
    <div className="p-5">
      <div className="flex w-full flex-col justify-between pb-4">
        <h2 className="text-md pb-4 font-medium text-neutral-900 dark:text-dark-1000">
          {`Are you sure you want to delete the workspace ${workspace.name}?`}
        </h2>
        <p className="mb-4 text-sm text-light-900 dark:text-dark-900">
          Keep in mind that this action is irreversible.
        </p>
        <p className="text-sm text-light-900 dark:text-dark-900">
          This will result in the permanent deletion of all data associated with
          this workspace.
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
            I acknowledge that all of the workspace data will be permanently
            deleted and want to proceed.
          </p>
        </div>
      </div>
      <div className="mt-5 flex justify-end space-x-2 sm:mt-6">
        <Button variant="secondary" onClick={() => closeModal()}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={handleDeleteWorkspace}
          disabled={!isAcknowledgmentChecked}
          isLoading={deleteWorkspaceMutation.isPending}
        >
          Delete workspace
        </Button>
      </div>
    </div>
  );
}
