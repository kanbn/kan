import { t } from "@lingui/core/macro";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import ContentEditable from "react-contenteditable";
import { useForm } from "react-hook-form";
import { HiEllipsisHorizontal, HiPencil, HiTrash } from "react-icons/hi2";

import Avatar from "~/components/Avatar";
import Button from "~/components/Button";
import Dropdown from "~/components/Dropdown";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";
import { invalidateCard } from "~/utils/cardInvalidation";

interface FormValues {
  comment: string;
}

const Comment = ({
  publicId,
  cardPublicId,
  name,
  email,
  isLoading,
  createdAt,
  comment,
  isAuthor,
  isAdmin,
  isEdited = false,
  isViewOnly = false,
}: {
  publicId: string | undefined;
  cardPublicId: string;
  name: string;
  email: string;
  isLoading: boolean;
  createdAt: string;
  comment: string | undefined;
  isAuthor: boolean;
  isAdmin: boolean;
  isEdited: boolean;
  isViewOnly: boolean;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const utils = api.useUtils();
  const { showPopup } = usePopup();
  const { openModal } = useModal();
  const { handleSubmit, setValue, watch } = useForm<FormValues>({
    defaultValues: {
      comment,
    },
  });

  if (!publicId) return null;

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
    ...(isAuthor
      ? [
          {
            label: t`Edit comment`,
            action: () => setIsEditing(true),
            icon: <HiPencil className="h-[16px] w-[16px] text-dark-900" />,
          },
        ]
      : []),
    ...(isAuthor || isAdmin
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
          <Avatar
            size="sm"
            name={name ?? ""}
            email={email ?? ""}
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
        <ContentEditable
          html={comment ?? ""}
          disabled={true}
          className="break-anywhere mt-2 text-sm"
        />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <ContentEditable
            placeholder={t`Add a comment...`}
            html={watch("comment")}
            disabled={false}
            onChange={(e) => setValue("comment", e.target.value)}
            className="block w-full max-w-[800px] border-0 bg-transparent py-1.5 text-sm text-light-900 focus-visible:outline-none dark:text-dark-1000 sm:text-sm sm:leading-6"
          />
          <div className="flex justify-end space-x-2">
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
