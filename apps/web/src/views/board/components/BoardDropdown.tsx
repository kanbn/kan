import { t } from "@lingui/core/macro";
import {
  HiEllipsisHorizontal,
  HiLink,
  HiOutlineDocumentDuplicate,
  HiOutlineTrash,
  HiOutlineStar,
  HiStar,
} from "react-icons/hi2";
import { IoArchiveOutline } from "react-icons/io5";
import Dropdown from "~/components/Dropdown";
import { usePermissions } from "~/hooks/usePermissions";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

export default function BoardDropdown({
  isTemplate,
  isLoading,
  isArchived,
  boardPublicId,
  workspacePublicId,
  isFavorite,
  boardName,
}: {
  isTemplate: boolean;
  isLoading: boolean;
  boardPublicId: string;
  workspacePublicId: string;
  isArchived?: boolean;
  isFavorite?: boolean;
  boardName?: string;
}) {
  const { openModal } = useModal();
  const { showPopup } = usePopup();
  const { canEditBoard, canDeleteBoard, canCreateBoard, canArchiveBoard } =
    usePermissions();
  const utils = api.useUtils();

  const updateBoard = api.board.update.useMutation({
    onSuccess: (_data, variables) => {
      void utils.board.all.invalidate();
      void utils.board.byId.invalidate();
      if (variables.favorite !== undefined) {
        showPopup({
          header: variables.favorite
            ? t`Added to favorites`
            : t`Removed from favorites`,
          message: variables.favorite
            ? t`${boardName ?? "Board"} has been added to your favorites.`
            : t`${boardName ?? "Board"} has been removed from your favorites.`,
          icon: "success",
        });
      }
    },
    onError: () => {
      showPopup({
        header: t`Unable to update board`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
  });

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

  const handleToggleFavorite = () => {
    updateBoard.mutate({
      boardPublicId,
      favorite: !isFavorite,
    });
  };

  const handleArchiveOrUnarchive = () => {
    if (isArchived) {
      unarchiveBoard.mutate({ boardPublicId });
    } else {
      archiveBoard.mutate({ boardPublicId });
    }
  };

  const isArchiveActionPending =
    archiveBoard.isPending || unarchiveBoard.isPending;

  const items = [
    ...(isTemplate && canCreateBoard
      ? [
        {
          label: t`Make template`,
          action: () => openModal("CREATE_TEMPLATE"),
          icon: (
            <HiOutlineDocumentDuplicate className="h-[16px] w-[16px] text-dark-900" />
          ),
        },
      ]
      : []),
    ...(!isTemplate && canEditBoard
      ? [
        {
          label: t`Edit board URL`,
          action: () => openModal("UPDATE_BOARD_SLUG"),
          icon: <HiLink className="h-[16px] w-[16px] text-dark-900" />,
        },
      ]
      : []),
    ...(!isTemplate && canArchiveBoard
      ? [
        {
          label: isArchived ? t`Unarchive board` : t`Archive board`,
          action: handleArchiveOrUnarchive,
          icon: (
            <IoArchiveOutline className="h-[16px] w-[16px] text-dark-900" />
          ),
        },
      ]
      : []),
    {
      label: isFavorite
        ? t`Remove from favorites`
        : t`Add to favorites`,
      action: handleToggleFavorite,
      icon: isFavorite ? (
        <HiStar className="h-[16px] w-[16px] text-dark-900" />
      ) : (
        <HiOutlineStar className="h-[16px] w-[16px] text-dark-900" />
      ),
    },
    ...(canDeleteBoard
      ? [
        {
          label: isTemplate ? t`Delete template` : t`Delete board`,
          action: () => openModal("DELETE_BOARD"),
          icon: (
            <HiOutlineTrash className="h-[16px] w-[16px] text-dark-900" />
          ),
        },
      ]
      : []),
  ];

  if (items.length === 0) {
    return null;
  }

  return (
    <Dropdown
      disabled={isLoading || isArchiveActionPending}
      items={items}
    >
      <HiEllipsisHorizontal className="h-5 w-5 text-dark-900" />
    </Dropdown>
  );
}
