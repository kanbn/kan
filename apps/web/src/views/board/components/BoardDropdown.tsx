import { t } from "@lingui/core/macro";
import {
  HiEllipsisHorizontal,
  HiLink,
  HiOutlineDocumentDuplicate,
  HiOutlineTrash,
} from "react-icons/hi2";
import { IoArchiveOutline } from "react-icons/io5";

import Dropdown from "~/components/Dropdown";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

export default function BoardDropdown({
  isTemplate,
  isLoading,
  isArchived,
  boardPublicId,
  workspacePublicId,
}: {
  isTemplate: boolean;
  isLoading: boolean;
  boardPublicId: string;
  workspacePublicId: string;
  isArchived?: boolean;
}) {
  const { openModal } = useModal();
  const { showPopup } = usePopup();
  const utils = api.useUtils();

  const archiveBoard = api.board.archive.useMutation({
    onSuccess: () => {
      void utils.board.all.invalidate({ workspacePublicId });
      void utils.board.byId.invalidate({ boardPublicId });
      showPopup({
        header: t`Board archived`,
        message: t`The board has been archived.`,
        icon: "success",
      });
    },
    onError: () => {
      showPopup({
        header: t`Unable to archive board`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
  });

  const unarchiveBoard = api.board.unarchive.useMutation({
    onSuccess: () => {
      void utils.board.all.invalidate({ workspacePublicId });
      void utils.board.byId.invalidate({ boardPublicId });
      showPopup({
        header: t`Board unarchived`,
        message: t`The board has been unarchived.`,
        icon: "success",
      });
    },
    onError: () => {
      showPopup({
        header: t`Unable to unarchive board`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
  });

  const handleArchiveOrUnarchive = () => {
    if (isArchived) {
      unarchiveBoard.mutate({ boardPublicId });
    } else {
      archiveBoard.mutate({ boardPublicId });
    }
  };

  const isArchiveActionPending =
    archiveBoard.isPending || unarchiveBoard.isPending;

  return (
    <Dropdown
      disabled={isLoading || isArchiveActionPending}
      items={[
        ...(isTemplate
          ? []
          : [
            {
              label: t`Make template`,
              action: () => openModal("CREATE_TEMPLATE"),
              icon: (
                <HiOutlineDocumentDuplicate className="h-[16px] w-[16px] text-dark-900" />
              ),
            },
            {
              label: t`Edit board URL`,
              action: () => openModal("UPDATE_BOARD_SLUG"),
              icon: <HiLink className="h-[16px] w-[16px] text-dark-900" />,
            },
            {
              label: isArchived ? t`Unarchive board` : t`Archive board`,
              action: handleArchiveOrUnarchive,
              icon: (
                <IoArchiveOutline className="h-[16px] w-[16px] text-dark-900" />
              ),
            },
          ]),
        {
          label: isTemplate ? t`Delete template` : t`Delete board`,
          action: () => openModal("DELETE_BOARD"),
          icon: <HiOutlineTrash className="h-[16px] w-[16px] text-dark-900" />,
        },
      ]}
    >
      <HiEllipsisHorizontal className="h-5 w-5 text-dark-900" />
    </Dropdown>
  );
}
