import { env } from "next-runtime-env";
import { HiMiniArrowTopRightOnSquare } from "react-icons/hi2";

import Button from "~/components/Button";
import Modal from "~/components/modal";
import { NewWorkspaceForm } from "~/components/NewWorkspaceForm";
import { PageHead } from "~/components/PageHead";
import { useModal } from "~/providers/modal";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import Avatar from "./components/Avatar";
import CreateAPIKeyForm from "./components/CreateAPIKeyForm";
import { CustomURLConfirmation } from "./components/CustomURLConfirmation";
import { DeleteAccountConfirmation } from "./components/DeleteAccountConfirmation";
import { DeleteWorkspaceConfirmation } from "./components/DeleteWorkspaceConfirmation";
import UpdateDisplayNameForm from "./components/UpdateDisplayNameForm";
import UpdateWorkspaceDescriptionForm from "./components/UpdateWorkspaceDescriptionForm";
import UpdateWorkspaceNameForm from "./components/UpdateWorkspaceNameForm";
import UpdateWorkspaceUrlForm from "./components/UpdateWorkspaceUrlForm";

export default function SettingsPage() {
  const { modalContentType, openModal } = useModal();
  const { workspace } = useWorkspace();
  const utils = api.useUtils();

  const { data } = api.user.getUser.useQuery();

  const refetchUser = () => utils.user.getUser.refetch();

  const handleOpenBillingPortal = async () => {
    try {
      const response = await fetch("/api/stripe/create_billing_session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const { url } = (await response.json()) as { url: string };

      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error("Error creating billing session:", error);
    }
  };

  return (
    <>
      <div className="flex h-full w-full flex-col overflow-hidden">
        <div className="h-full max-h-[calc(100vh-4rem)] overflow-y-auto">
          <PageHead title={`Settings | ${workspace.name ?? "Workspace"}`} />
          <div className="px-28 py-12">
            <div className="mb-8 flex w-full justify-between">
              <h1 className="font-bold tracking-tight text-neutral-900 dark:text-dark-1000 sm:text-[1.2rem]">
                Settings
              </h1>
            </div>

            <div className="mb-8 border-t border-light-300 dark:border-dark-300">
              <h2 className="mb-4 mt-8 text-[14px] text-neutral-900 dark:text-dark-1000">
                Profile picture
              </h2>
              <Avatar userId={data?.id} userImage={data?.image} />

              <h2 className="mb-4 mt-8 text-[14px] text-neutral-900 dark:text-dark-1000">
                Display name
              </h2>
              <UpdateDisplayNameForm displayName={data?.name ?? ""} />
            </div>

            <div className="mb-8 border-t border-light-300 dark:border-dark-300">
              <h2 className="mb-4 mt-8 text-[14px] text-neutral-900 dark:text-dark-1000">
                Workspace name
              </h2>
              <UpdateWorkspaceNameForm
                workspacePublicId={workspace.publicId}
                workspaceName={workspace.name}
              />

              <h2 className="mb-4 mt-8 text-[14px] text-neutral-900 dark:text-dark-1000">
                Workspace URL
              </h2>
              <UpdateWorkspaceUrlForm
                workspacePublicId={workspace.publicId}
                workspaceUrl={workspace.slug}
                workspacePlan={workspace.plan}
              />

              <h2 className="mb-4 mt-8 text-[14px] text-neutral-900 dark:text-dark-1000">
                Workspace description
              </h2>
              <UpdateWorkspaceDescriptionForm
                workspacePublicId={workspace.publicId}
                workspaceDescription={workspace.description ?? ""}
              />
            </div>

            {env("NEXT_PUBLIC_KAN_ENV") === "cloud" && (
              <div className="mb-8 border-t border-light-300 dark:border-dark-300">
                <h2 className="mb-4 mt-8 text-[14px] text-neutral-900 dark:text-dark-1000">
                  Billing
                </h2>
                <p className="mb-8 text-sm text-neutral-500 dark:text-dark-900">
                  View and manage your billing and subscription.
                </p>
                <Button
                  variant="primary"
                  iconRight={<HiMiniArrowTopRightOnSquare />}
                  onClick={handleOpenBillingPortal}
                >
                  Billing portal
                </Button>
              </div>
            )}

            <div className="mb-8 border-t border-light-300 dark:border-dark-300">
              <h2 className="mb-4 mt-8 text-[14px] text-neutral-900 dark:text-dark-1000">
                API keys
              </h2>
              <p className="mb-8 text-sm text-neutral-500 dark:text-dark-900">
                View and manage your API keys.
              </p>
              <CreateAPIKeyForm
                apiKey={data?.apiKey}
                refetchUser={refetchUser}
              />
            </div>

            <div className="mb-8 border-t border-light-300 dark:border-dark-300">
              <h2 className="mb-4 mt-8 text-[14px] text-neutral-900 dark:text-dark-1000">
                Delete workspace
              </h2>
              <p className="mb-8 text-sm text-neutral-500 dark:text-dark-900">
                Once you delete your workspace, there is no going back. This
                action cannot be undone.
              </p>
              <div className="mt-4">
                <Button
                  variant="secondary"
                  onClick={() => openModal("DELETE_WORKSPACE")}
                >
                  Delete workspace
                </Button>
              </div>
            </div>

            <div className="mb-8 border-t border-light-300 dark:border-dark-300">
              <h2 className="mb-4 mt-8 text-[14px] text-neutral-900 dark:text-dark-1000">
                Delete account
              </h2>
              <p className="mb-8 text-sm text-neutral-500 dark:text-dark-900">
                Once you delete your account, there is no going back. This
                action cannot be undone.
              </p>
              <div className="mt-4">
                <Button
                  variant="secondary"
                  onClick={() => openModal("DELETE_ACCOUNT")}
                >
                  Delete account
                </Button>
              </div>
            </div>
          </div>

          <Modal>
            {modalContentType === "NEW_WORKSPACE" && <NewWorkspaceForm />}
            {modalContentType === "DELETE_WORKSPACE" && (
              <DeleteWorkspaceConfirmation />
            )}
            {modalContentType === "UPDATE_WORKSPACE_URL" && (
              <CustomURLConfirmation workspacePublicId={workspace.publicId} />
            )}
            {modalContentType === "DELETE_ACCOUNT" && (
              <DeleteAccountConfirmation />
            )}
          </Modal>
        </div>
      </div>
    </>
  );
}
