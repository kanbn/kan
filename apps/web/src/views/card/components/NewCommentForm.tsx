import { t } from "@lingui/core/macro";
import { useForm } from "react-hook-form";
import { HiOutlineArrowUp } from "react-icons/hi2";

import type { WorkspaceMember } from "~/components/Editor";
import Editor from "~/components/Editor";
import LoadingSpinner from "~/components/LoadingSpinner";
import { Tooltip } from "~/components/Tooltip";
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
    onError: (_error, _newList) => {
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

  const isMac =
    typeof navigator !== "undefined" && navigator.userAgent.includes("Mac");

  const submitTooltip = (
    <div className="flex flex-row items-center gap-2 text-[11px]">
      {t`Submit`}
      <span className="inline-flex items-center justify-center rounded border border-light-400 bg-light-200 px-1.5 py-0.5 font-mono text-[8px] font-semibold text-neutral-900 dark:border-dark-400 dark:bg-dark-200 dark:text-dark-950">
        {isMac ? "⌘" : "Ctrl"}
      </span>
      <span className="inline-flex items-center justify-center rounded border border-light-400 bg-light-200 px-1.5 py-0.5 font-mono text-[8px] font-semibold text-neutral-900 dark:border-dark-400 dark:bg-dark-200 dark:text-dark-950">
        Enter
      </span>
    </div>
  );

  if (!canCreateComment) {
    return null;
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full max-w-[800px] flex-col rounded-xl border border-light-600 bg-light-100 p-4 text-light-900 focus-visible:outline-none dark:border-dark-400 dark:bg-dark-100 dark:text-dark-1000 sm:text-sm sm:leading-6"
    >
      <Editor
        content={watch("comment")}
        onChange={(value) => setValue("comment", value)}
        onSubmit={handleSubmit(onSubmit)}
        workspaceMembers={workspaceMembers}
        enableYouTubeEmbed={false}
        placeholder={t`Add comment... (type '/' to open commands or '@' to mention)`}
        disableHeadings={true}
      />
      <div className="flex justify-end">
        <Tooltip content={submitTooltip} placement="top">
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
        </Tooltip>
      </div>
    </form>
  );
};

export default NewCommentForm;
