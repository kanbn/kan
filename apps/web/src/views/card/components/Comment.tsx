import { t } from "@lingui/core/macro";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { HiEllipsisHorizontal, HiPencil, HiTrash } from "react-icons/hi2";

import { useGetCard, useUpdateCardComment } from "@kan/api-client/hooks";

import type { WorkspaceMember } from "~/components/Editor";
import Avatar from "~/components/Avatar";
import Button from "~/components/Button";
import Dropdown from "~/components/Dropdown";
import Editor from "~/components/Editor";
import { usePermissions } from "~/hooks/usePermissions";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useCardCache } from "~/utils/cardCache";
import { invalidateCard } from "~/utils/cardInvalidation";
import { getAvatarUrl } from "~/utils/helpers";

interface FormValues {
  comment: string;
}

const Comment = ({
  publicId,
  cardPublicId,
  userId,
  name,
  email,
  image,
  isLoading,
  createdAt,
  comment,
  isAuthor,
  isEdited = false,
  isViewOnly = false,
}: {
  publicId: string | undefined;
  cardPublicId: string;
  userId: string | null;
  name: string;
  email: string;
  image: string | null;
  isLoading: boolean;
  createdAt: string;
  comment: string | undefined;
  isAuthor: boolean;
  isEdited: boolean;
  isViewOnly: boolean;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const cardCache = useCardCache();
  const { showPopup } = usePopup();
  const { openModal } = useModal();
  const { canEditComment, canDeleteComment } = usePermissions();
  const { handleSubmit, setValue, watch } = useForm<FormValues>({
    defaultValues: {
      comment,
    },
  });

  const { data: cardData } = useGetCard(cardPublicId, {
    query: {
      enabled: !!cardPublicId && cardPublicId.length >= 12,
      select: (res) => res.data,
    },
  });

  const members = cardData?.list.board.workspace.members ?? [];

  const isPaused = members.some(
    (member) =>
      member.status === "paused" &&
      (userId ? member.user?.id === userId : member.email === email),
  );

  // Paused members can't be newly mentioned.
  const workspaceMembers: WorkspaceMember[] = members
    .filter((member) => member.email && member.status !== "paused")
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
    }));

  const updateCommentMutation = useUpdateCardComment({
    mutation: {
      onSuccess: async () => {
        await invalidateCard(cardCache, cardPublicId);
        setIsEditing(false);
      },
      onError: () => {
        showPopup({
          header: t`Unable to update comment`,
          message: t`Please try again later, or contact customer support.`,
          icon: "error",
        });
      },
    },
  });

  if (!publicId) return null;

  const onSubmit = (data: FormValues) => {
    updateCommentMutation.mutate({
      cardPublicId,
      commentPublicId: publicId,
      data: { comment: data.comment },
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
      className="group relative flex w-full flex-col rounded-xl border border-light-600 bg-light-200 p-4 text-light-900 focus-visible:outline-none dark:border-dark-400 dark:bg-dark-100 dark:text-dark-1000 sm:text-sm sm:leading-6"
    >
      <div className="flex justify-between">
        <div className="flex items-center space-x-2">
          <span className={isPaused ? "opacity-50" : undefined}>
            <Avatar
              size="sm"
              name={name ?? ""}
              email={email ?? ""}
              imageUrl={getAvatarUrl(image) || undefined}
              isLoading={isLoading}
            />
          </span>

          <p className="text-sm">
            <span className="font-medium dark:text-dark-1000">{`${name} `}</span>
            {isPaused && (
              <span className="text-light-800 dark:text-dark-800">
                ({t`Paused`})
              </span>
            )}
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
            <Dropdown items={dropdownItems} ariaLabel={t`Comment options`}>
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
