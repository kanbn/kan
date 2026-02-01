import { useRouter } from "next/router";
import { t } from "@lingui/core/macro";
import { env } from "next-runtime-env";
import { useEffect, useState } from "react";
import { HiBolt } from "react-icons/hi2";

import type { Subscription } from "@kan/shared/utils";
import { hasActiveSubscription } from "@kan/shared/utils";

import Button from "~/components/Button";
import FeedbackModal from "~/components/FeedbackModal";
import Modal from "~/components/modal";
import { NewWorkspaceForm } from "~/components/NewWorkspaceForm";
import { PageHead } from "~/components/PageHead";
import { usePermissions } from "~/hooks/usePermissions";
import { useModal } from "~/providers/modal";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import { DeleteWorkspaceConfirmation } from "./components/DeleteWorkspaceConfirmation";
import UpdateWorkspaceDescriptionForm from "./components/UpdateWorkspaceDescriptionForm";
import UpdateWorkspaceEmailVisibilityForm from "./components/UpdateWorkspaceEmailVisibilityForm";
import UpdateWorkspaceNameForm from "./components/UpdateWorkspaceNameForm";
import UpdateWorkspaceUrlForm from "./components/UpdateWorkspaceUrlForm";
import { UpgradeToProConfirmation } from "./components/UpgradeToProConfirmation";

export default function WorkspaceSettings() {
  const { modalContentType, openModal, isOpen } = useModal();
  const { workspace } = useWorkspace();
  const { canEditWorkspace } = usePermissions();
  const router = useRouter();
  const { data } = api.user.getUser.useQuery();
  const [hasOpenedUpgradeModal, setHasOpenedUpgradeModal] = useState(false);

  const { data: workspaceData } = api.workspace.byId.useQuery({
    workspacePublicId: workspace.publicId,
  });

  const subscriptions = workspaceData?.subscriptions as
    | Subscription[]
    | undefined;

  // Open upgrade modal if upgrade=pro is in URL params
  useEffect(() => {
    if (
      router.query.upgrade === "pro" &&
      env("NEXT_PUBLIC_KAN_ENV") === "cloud" &&
      !hasActiveSubscription(subscriptions, "pro") &&
      !hasOpenedUpgradeModal
    ) {
      openModal("UPGRADE_TO_PRO");
      setHasOpenedUpgradeModal(true);
    }
  }, [router.query.upgrade, subscriptions, openModal, hasOpenedUpgradeModal]);

  return (
    <>
      <PageHead title={t`Settings | Workspace`} />

      <div className="mb-8 border-t border-light-300 dark:border-dark-300">
        <h2 className="mb-4 mt-8 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
          {t`Workspace name`}
        </h2>
        <UpdateWorkspaceNameForm
          workspacePublicId={workspace.publicId}
          workspaceName={workspace.name}
          disabled={!canEditWorkspace}
        />

        <h2 className="mb-4 mt-8 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
          {t`Workspace URL`}
        </h2>
        <UpdateWorkspaceUrlForm
          workspacePublicId={workspace.publicId}
          workspaceUrl={workspace.slug ?? ""}
          workspacePlan={workspace.plan ?? "free"}
          disabled={!canEditWorkspace}
        />

        <h2 className="mb-4 mt-8 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
          {t`Workspace description`}
        </h2>
        <UpdateWorkspaceDescriptionForm
          workspacePublicId={workspace.publicId}
          workspaceDescription={workspace.description ?? ""}
          disabled={!canEditWorkspace}
        />

        <h2 className="mb-4 mt-8 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
          {t`Email visibility`}
        </h2>
        <UpdateWorkspaceEmailVisibilityForm
          workspacePublicId={workspace.publicId}
          showEmailsToMembers={Boolean(
            workspaceData?.showEmailsToMembers ?? false,
          )}
          disabled={!canEditWorkspace}
        />

        {env("NEXT_PUBLIC_KAN_ENV") === "cloud" &&
          !hasActiveSubscription(subscriptions, "pro") &&
          !hasActiveSubscription(subscriptions, "team") && (
            <div className="my-8">
              <Button
                onClick={() => openModal("UPGRADE_TO_PRO")}
                iconRight={<HiBolt />}
              >
                {t`Upgrade to Pro`}
              </Button>
            </div>
          )}

        <div className="border-t border-light-300 dark:border-dark-300">
          <h2 className="mb-4 mt-8 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
            {t`Delete workspace`}
          </h2>
          <p className="mb-8 text-sm text-neutral-500 dark:text-dark-900">
            {t`Once you delete your workspace, there is no going back. This action cannot be undone.`}
          </p>
          <div className="mt-4">
            <Button
              variant="secondary"
              onClick={() => openModal("DELETE_WORKSPACE")}
              disabled={workspace.role !== "admin"}
            >
              {t`Delete workspace`}
            </Button>
          </div>
        </div>
      </div>

      {/* Workspace-specific modals */}
      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "DELETE_WORKSPACE"}
      >
        <DeleteWorkspaceConfirmation />
      </Modal>
      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "UPGRADE_TO_PRO"}
      >
        <UpgradeToProConfirmation
          userId={data?.id ?? ""}
          workspacePublicId={workspace.publicId}
        />
      </Modal>

      {/* Global modals */}
      <Modal
        modalSize="md"
        isVisible={isOpen && modalContentType === "NEW_FEEDBACK"}
      >
        <FeedbackModal />
      </Modal>
      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "NEW_WORKSPACE"}
      >
        <NewWorkspaceForm />
      </Modal>
    </>
  );
}
