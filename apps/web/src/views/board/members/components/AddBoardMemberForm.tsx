import { t } from "@lingui/core/macro";
import { useState } from "react";
import { HiXMark } from "react-icons/hi2";

import Button from "~/components/Button";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

export function AddBoardMemberForm({
  boardPublicId,
  availableMembers,
}: {
  boardPublicId: string;
  availableMembers: { publicId: string; label: string }[];
}) {
  const { closeModal } = useModal();
  const { showPopup } = usePopup();
  const utils = api.useUtils();
  const [selectedPublicId, setSelectedPublicId] = useState("");

  const addMember = api.boardMember.add.useMutation({
    onSuccess: async () => {
      closeModal();
      setSelectedPublicId("");
      await utils.boardMember.all.invalidate({ boardPublicId });
    },
    onError: (error) => {
      showPopup({
        header: t`Unable to add member`,
        message: error.message,
        icon: "error",
      });
    },
  });

  const handleSubmit = () => {
    if (!selectedPublicId) return;

    addMember.mutate({
      boardPublicId,
      workspaceMemberPublicId: selectedPublicId,
    });
  };

  return (
    <div className="p-5">
      <div className="flex w-full items-center justify-between pb-4 text-neutral-900 dark:text-dark-1000">
        <h2 className="text-sm font-bold">{t`Add board member`}</h2>
        <button
          type="button"
          className="rounded p-1 focus:outline-none hover:bg-light-300 dark:hover:bg-dark-300"
          onClick={() => closeModal()}
        >
          <HiXMark size={18} className="text-light-900 dark:text-dark-900" />
        </button>
      </div>

      {availableMembers.length === 0 ? (
        <p className="text-sm text-light-900 dark:text-dark-900">
          {t`Every active workspace member is already on this board.`}
        </p>
      ) : (
        <>
          <label
            htmlFor="board-member"
            className="mb-2 block text-sm font-medium text-light-900 dark:text-dark-900"
          >
            {t`Workspace member`}
          </label>
          <select
            id="board-member"
            value={selectedPublicId}
            onChange={(e) => setSelectedPublicId(e.target.value)}
            className="block w-full rounded-md border-0 bg-dark-300 bg-white/5 py-1.5 text-sm shadow-sm ring-1 ring-inset ring-light-600 placeholder:text-dark-800 focus:ring-2 focus:ring-inset focus:ring-light-700 dark:text-dark-1000 dark:ring-dark-700 dark:focus:ring-dark-700 sm:leading-6"
          >
            <option value="">{t`Select a member`}</option>
            {availableMembers.map((member) => (
              <option key={member.publicId} value={member.publicId}>
                {member.label}
              </option>
            ))}
          </select>
        </>
      )}

      <div className="mt-5 flex justify-end space-x-2 sm:mt-6">
        <Button onClick={() => closeModal()} variant="secondary">
          {t`Cancel`}
        </Button>
        {availableMembers.length > 0 && (
          <Button
            onClick={handleSubmit}
            isLoading={addMember.isPending}
            disabled={!selectedPublicId}
          >
            {t`Add member`}
          </Button>
        )}
      </div>
    </div>
  );
}
