import { t } from "@lingui/core/macro";
import { useEffect } from "react";
import { HiArrowDownTray, HiOutlinePlusSmall } from "react-icons/hi2";

import Button from "~/components/Button";
import FeedbackModal from "~/components/FeedbackModal";
import Modal from "~/components/modal";
import { NewWorkspaceForm } from "~/components/NewWorkspaceForm";
import { PageHead } from "~/components/PageHead";
import { useModal } from "~/providers/modal";
import { useWorkspace } from "~/providers/workspace";
import { BoardsList } from "./components/BoardsList";
import { ImportBoardsForm } from "./components/ImportBoardsForm";
import { NewBoardForm } from "./components/NewBoardForm";

export default function BoardsPage() {
  const { openModal, modalContentType, isOpen } = useModal();
  const { availableWorkspaces, workspace, hasLoaded } = useWorkspace();

  useEffect(() => {
    if (hasLoaded && availableWorkspaces.length === 0) {
      openModal("NEW_WORKSPACE");
    }
  }, [hasLoaded, availableWorkspaces.length, openModal]);

  return (
    <>
      <PageHead title={t`Boards | ${workspace.name ?? "Workspace"}`} />
      <div className="m-auto h-full max-w-[1100px] p-6 px-5 md:px-28 md:py-12">
        <div className="relative z-10 mb-8 flex w-full items-center justify-between">
          <h1 className="font-bold tracking-tight text-neutral-900 dark:text-dark-1000 sm:text-[1.2rem]">
            {t`Boards`}
          </h1>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => openModal("IMPORT_BOARDS")}
              iconLeft={
                <HiArrowDownTray aria-hidden="true" className="h-4 w-4" />
              }
            >
              {t`Import`}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => openModal("NEW_BOARD")}
              iconLeft={
                <HiOutlinePlusSmall aria-hidden="true" className="h-4 w-4" />
              }
            >
              {t`New`}
            </Button>
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
            <NewBoardForm />
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
        </>

        <div className="flex h-full flex-row">
          <BoardsList />
        </div>
      </div>
    </>
  );
}
