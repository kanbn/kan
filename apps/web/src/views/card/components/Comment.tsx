import { t } from "@lingui/core/macro";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  HiEllipsisHorizontal,
  HiOutlineArrowUp,
  HiPencil,
  HiTrash,
} from "react-icons/hi2";

import type { WorkspaceMember } from "~/components/Editor";
import Avatar from "~/components/Avatar";
import Button from "~/components/Button";
import Dropdown from "~/components/Dropdown";
import Editor from "~/components/Editor";
import { usePermissions } from "~/hooks/usePermissions";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";
import { invalidateCard } from "~/utils/cardInvalidation";
import { getAvatarUrl } from "~/utils/helpers";

interface FormValues {
  comment: string;
}

const Comment = ({
  publicId,
  cardPublicId,
  name,
  email,
  image,
  isLoading,
  createdAt,
  comment,
  isAuthor,
  isEdited = false,
  isViewOnly = false,
  depth = 0,
  onReply,
}: {
  publicId: string | undefined;
  cardPublicId: string;
  name: string;
  email: string;
  image: string | null;
  isLoading: boolean;
  createdAt: string;
  comment: string | undefined;
  isAuthor: boolean;
  isEdited: boolean;
  isViewOnly: boolean;
  depth?: number;
  onReply?: (args: { publicId: string; name: string }) => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const utils = api.useUtils();
  const { showPopup } = usePopup();
  const { openModal } = useModal();
  const { canEditComment, canDeleteComment, canCreateComment } =
    usePermissions();
  const { handleSubmit, setValue, watch } = useForm<FormValues>({
    defaultValues: {
      comment,
    },
  });

  const { data: cardData } = api.card.byId.useQuery(
    {
      cardPublicId,
    },
    {
      enabled: !!cardPublicId && cardPublicId.length >= 12,
    },
  );

  const workspaceMembers: WorkspaceMember[] =
    cardData?.list.board.workspace.members
      .filter((member) => member.email)
      .map((member) => ({
        publicId: member.publicId,
        email: member.email,
        user: member.user
          ? {
              id: member.user.id,
              name: member.user.name ?? null,
              image: member.user.image ?? null,
            }
          : null,
      })) ?? [];

  if (!publicId) return null;

  const INDENT_CLASSES = [
    "",
    "ml-8",
    "ml-14",
    "ml-20",
    "ml-24",
    "ml-28",
    "ml-32",
  ] as const;
  const normalizedDepth = Math.max(0, depth ?? 0);
  const depthClass =
    INDENT_CLASSES[Math.min(normalizedDepth, INDENT_CLASSES.length - 1)];

  const updateCommentMutation = api.card.updateComment.useMutation({
    onSuccess: async () => {
      await invalidateCard(utils, cardPublicId);
      setIsEditing(false);
    },
    onError: () => {
      showPopup({
        header: t`Unable to update comment`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    updateCommentMutation.mutate({
      cardPublicId,
      comment: data.comment,
      commentPublicId: publicId,
    });
  };

  const dropdownItems = [
    ...(isAuthor && canEditComment
      ? [
          {
            label: t`Edit comment`,
            action: () => setIsEditing(true),
            icon: <HiPencil className="h-[16px] w-[16px] text-dark-900" />,
          },
        ]
      : []),
    ...(isAuthor || canDeleteComment
      ? [
          {
            label: t`Delete comment`,
            action: () => openModal("DELETE_COMMENT", publicId),
            icon: <HiTrash className="h-[16px] w-[16px] text-dark-900" />,
          },
        ]
      : []),
  ];

  return (
    <div
      key={publicId}
      className={`group relative flex w-full flex-col rounded-xl border border-light-600 bg-light-200 p-4 text-light-900 focus-visible:outline-none dark:border-dark-400 dark:bg-dark-100 dark:text-dark-1000 sm:text-sm sm:leading-6 ${depthClass}`}
    >
      <div className="flex justify-between">
        <div className="flex items-center space-x-2">
          <Avatar
            size="sm"
            name={name ?? ""}
            email={email ?? ""}
            imageUrl={getAvatarUrl(image) || undefined}
            isLoading={isLoading}
          />

          <p className="text-sm">
            <span className="font-medium dark:text-dark-1000">{`${name} `}</span>
            <span className="mx-1 text-light-900 dark:text-dark-800">·</span>
            <span className="space-x-1 text-light-900 dark:text-dark-800">
              {formatDistanceToNow(new Date(createdAt), {
                addSuffix: true,
              })}
            </span>
            {isEdited && (
              <span className="text-light-900 dark:text-dark-800">
                {t` (edited)`}
              </span>
            )}
          </p>
        </div>

        {dropdownItems.length > 0 && !isViewOnly && (
          <div className="absolute right-4 top-4">
            <Dropdown items={dropdownItems}>
              <HiEllipsisHorizontal className="h-5 w-5 text-light-900 dark:text-dark-800" />
            </Dropdown>
          </div>
        )}
      </div>
      {!isEditing ? (
        <div className="mt-2">
          <Editor
            content={comment ?? null}
            readOnly={true}
            workspaceMembers={workspaceMembers}
            enableYouTubeEmbed={false}
            disableHeadings={true}
          />

          {canCreateComment && !isViewOnly && onReply && (
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() =>
                  onReply({
                    publicId,
                    name: name?.trim() ? name : email || t`Member`,
                  })
                }
                className="flex h-8 w-8 items-center justify-center rounded-full border border-light-600 bg-light-300 hover:bg-light-400 disabled:opacity-50 dark:border-dark-400 dark:bg-dark-200 dark:hover:bg-dark-400"
              >
                <HiOutlineArrowUp />
              </button>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mt-2">
            <Editor
              content={watch("comment")}
              onChange={(value) => setValue("comment", value)}
              workspaceMembers={workspaceMembers}
              enableYouTubeEmbed={false}
              placeholder={t`Add comment... (type '/' to open commands or '@' to mention)`}
              disableHeadings={true}
            />
          </div>
          <div className="mt-2 flex justify-end space-x-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(false)}
            >
              {t`Cancel`}
            </Button>
            <Button
              isLoading={updateCommentMutation.isPending}
              type="submit"
              size="sm"
            >
              {t`Save`}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

export default Comment;
