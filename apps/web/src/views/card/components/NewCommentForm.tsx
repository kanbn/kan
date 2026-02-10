import { t } from "@lingui/core/macro";
import { useForm } from "react-hook-form";
import { HiOutlineArrowUp } from "react-icons/hi2";

import CommentEditor from "~/components/CommentEditor";
import LoadingSpinner from "~/components/LoadingSpinner";
import type { WorkspaceMember } from "~/components/MentionSuggestion";
import { usePermissions } from "~/hooks/usePermissions";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";
import { invalidateCard } from "~/utils/cardInvalidation";

interface FormValues {
  comment: string;
}

const NewCommentForm = ({
  cardPublicId,
  workspaceMembers,
}: {
  cardPublicId: string;
  workspaceMembers: WorkspaceMember[];
}) => {
  const utils = api.useUtils();
  const { showPopup } = usePopup();
  const { canCreateComment } = usePermissions();
  const { handleSubmit, setValue, watch, reset } = useForm<FormValues>({
    values: {
      comment: "",
    },
  });

  const addCommentMutation = api.card.addComment.useMutation({
    onError: () => {
      showPopup({
        header: t`Unable to add comment`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      reset();
      await invalidateCard(utils, cardPublicId);
    },
  });

  const onSubmit = (data: FormValues) => {
    addCommentMutation.mutate({
      cardPublicId,
      comment: data.comment,
    });
  };

  if (!canCreateComment) {
    return null;
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full max-w-[800px] flex-col rounded-xl border border-light-600 bg-light-100 p-4 text-light-900 focus-visible:outline-none dark:border-dark-400 dark:bg-dark-100 dark:text-dark-1000 sm:text-sm sm:leading-6"
    >
      <CommentEditor
        content={watch("comment")}
        onChange={(html) => setValue("comment", html)}
        onSubmit={() => handleSubmit(onSubmit)()}
        placeholder={t`Add a comment... (type '@' to mention)`}
        workspaceMembers={workspaceMembers}
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={addCommentMutation.isPending}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-light-600 bg-light-300 hover:bg-light-400 disabled:opacity-50 dark:border-dark-400 dark:bg-dark-200 dark:hover:bg-dark-400"
        >
          {addCommentMutation.isPending ? (
            <LoadingSpinner size="sm" />
          ) : (
            <HiOutlineArrowUp />
          )}
        </button>
      </div>
    </form>
  );
};

export default NewCommentForm;
