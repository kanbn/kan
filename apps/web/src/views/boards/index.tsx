import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { useMemo, useState } from "react";
import { HiArrowDownTray, HiOutlinePlusSmall } from "react-icons/hi2";

import Button from "~/components/Button";
import FeedbackModal from "~/components/FeedbackModal";
import Modal from "~/components/modal";
import { NewWorkspaceForm } from "~/components/NewWorkspaceForm";
import { PageHead } from "~/components/PageHead";
import { Tooltip } from "~/components/Tooltip";
import { usePermissions } from "~/hooks/usePermissions";
import { useKeyboardShortcut } from "~/providers/keyboard-shortcuts";
import { useModal } from "~/providers/modal";
import { useWorkspace } from "~/providers/workspace";
import { BoardFilters, BoardLabelModals } from "./components/BoardLabels";
import { BoardsList } from "./components/BoardsList";
import { ImportBoardsForm } from "./components/ImportBoardsForm";
import { NewBoardForm } from "./components/NewBoardForm";

export default function BoardsPage({ isTemplate }: { isTemplate?: boolean }) {
  useLingui();
  const boardsTabs = [
    { key: "boards" as const, label: t`Active` },
    { key: "archived" as const, label: t`Archived` },
  ];
  const { openModal, modalContentType, isOpen } = useModal();
  const { workspace } = useWorkspace();
  const [activeTab, setActiveTab] = useState<"boards" | "archived">("boards");
  const { canCreateBoard } = usePermissions();

  const createBoardShortcut = useMemo(
    () => ({
      type: "PRESS" as const,
      stroke: { key: "C" },
      action: () => canCreateBoard && openModal("NEW_BOARD"),
      description: t`Create new ${isTemplate ? "template" : "board"}`,
      group: "ACTIONS" as const,
    }),
    [canCreateBoard, isTemplate, openModal],
  );

  const { tooltipContent: createModalShortcutTooltipContent } =
    useKeyboardShortcut(createBoardShortcut);

  return (
    <>
      <PageHead
        title={t`${isTemplate ? t`Templates` : t`Boards`} | ${workspace.name}`}
      />
      <div className="m-auto h-full max-w-[1100px] p-8 px-5 md:px-28 md:py-12">
        <div className="relative z-10 mb-6 flex w-full items-center justify-between">
          <h1 className="font-bold tracking-tight text-neutral-900 sm:text-base dark:text-dark-1000">
            {isTemplate ? t`Templates` : t`Boards`}
          </h1>
          <div className="flex gap-2">
            {!isTemplate && <BoardFilters />}
            {!isTemplate && (
              <Tooltip
                content={
                  !canCreateBoard ? t`You don't have permission` : undefined
                }
              >
                <Button
                  size="sm"
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (canCreateBoard) openModal("IMPORT_BOARDS");
                  }}
                  disabled={!canCreateBoard}
                  iconLeft={
                    <HiArrowDownTray aria-hidden="true" className="h-4 w-4" />
                  }
                >
                  {t`Import`}
                </Button>
              </Tooltip>
            )}
            <Tooltip
              content={
                !canCreateBoard
                  ? t`You don't have permission`
                  : createModalShortcutTooltipContent
              }
            >
              <Button
                size="sm"
                type="button"
                variant="primary"
                onClick={() => {
                  if (canCreateBoard) openModal("NEW_BOARD");
                }}
                disabled={!canCreateBoard}
                iconLeft={
                  <HiOutlinePlusSmall aria-hidden="true" className="h-4 w-4" />
                }
              >
                {t`New`}
              </Button>
            </Tooltip>
          </div>
        </div>

        <>
          <Modal
            modalSize="md"
            isVisible={isOpen && modalContentType === "NEW_FEEDBACK"}
          >
            <FeedbackModal />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "NEW_BOARD"}
          >
            <NewBoardForm isTemplate={!!isTemplate} />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "IMPORT_BOARDS"}
          >
            <ImportBoardsForm />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "NEW_WORKSPACE"}
          >
            <NewWorkspaceForm />
          </Modal>

          <BoardLabelModals />
        </>

        {!isTemplate ? (
          <div className="flex h-full w-full flex-col">
            <div className="focus:outline-hidden">
              <nav
                aria-label="Tabs"
                className="mb-5 flex space-x-6 border-b border-light-300 dark:border-dark-200"
              >
                {boardsTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`-mb-px border-b px-0 pt-2 pb-3 text-xs font-medium whitespace-nowrap transition-colors focus:outline-hidden ${
                      activeTab === tab.key
                        ? "border-light-1000 text-light-1000 dark:border-dark-1000 dark:text-dark-1000"
                        : "border-transparent text-light-900 hover:border-light-950 hover:text-light-950 dark:text-dark-900 dark:hover:border-white/20 dark:hover:text-dark-950"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
            <div className="flex h-full flex-row focus:outline-hidden">
              {activeTab === "boards" && (
                <BoardsList isTemplate={false} archived={false} />
              )}
              {activeTab === "archived" && (
                <BoardsList isTemplate={false} archived={true} />
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-row">
            <BoardsList isTemplate={!!isTemplate} />
          </div>
        )}
      </div>
    </>
  );
}
