import { t } from "@lingui/core/macro";
import { HiXMark } from "react-icons/hi2";

import { useModal } from "~/providers/modal";
import { useWorkspace } from "~/providers/workspace";
import { BoardBackgroundSettingsForm } from "./BoardBackgroundSettingsForm";
import { BoardSlugSettingsForm } from "./BoardSlugSettingsForm";
import { BoardVisibilitySettingsForm } from "./BoardVisibilitySettingsForm";

interface QueryParams {
  boardPublicId: string;
  members: string[];
  labels: string[];
  lists: string[];
}

export function BoardSettingsForm({
  boardPublicId,
  backgroundColor,
  workspaceSlug,
  boardSlug,
  visibility,
  queryParams,
}: {
  boardPublicId: string;
  backgroundColor: string | null;
  workspaceSlug: string;
  boardSlug: string;
  visibility: string;
  queryParams: QueryParams;
}) {
  const { closeModal } = useModal();
  const { workspace } = useWorkspace();

  return (
    <div className="p-5">
      <div className="flex w-full items-center justify-between pb-4">
        <h2 className="text-sm font-bold text-neutral-900 dark:text-dark-1000">
          {t`Board settings`}
        </h2>
        <button
          type="button"
          className="rounded p-1 hover:bg-light-200 focus:outline-none dark:hover:bg-dark-300"
          onClick={(e) => {
            e.preventDefault();
            closeModal();
          }}
        >
          <HiXMark size={18} className="text-light-900 dark:text-dark-900" />
        </button>
      </div>
      <BoardBackgroundSettingsForm
        boardPublicId={boardPublicId}
        backgroundColor={backgroundColor}
        queryParams={queryParams}
      />
      <BoardSlugSettingsForm
        boardPublicId={boardPublicId}
        workspaceSlug={workspaceSlug}
        boardSlug={boardSlug}
        visibility={visibility}
        queryParams={queryParams}
      />
      <BoardVisibilitySettingsForm
        boardPublicId={boardPublicId}
        visibility={visibility}
        isAdmin={workspace.role === "admin"}
        queryParams={queryParams}
      />
    </div>
  );
}
