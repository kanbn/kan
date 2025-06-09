import { env } from "next-runtime-env";
import { useEffect } from "react";
import { HiMiniArrowTopRightOnSquare } from "react-icons/hi2";

import Button from "~/components/Button";
import Modal from "~/components/modal";
import { NewWorkspaceForm } from "~/components/NewWorkspaceForm";
import { PageHead } from "~/components/PageHead";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import Avatar from "./components/Avatar";
import CreateAPIKeyForm from "./components/CreateAPIKeyForm";
import { CustomURLConfirmation } from "./components/CustomURLConfirmation";
import { DeleteWorkspaceConfirmation } from "./components/DeleteWorkspaceConfirmation";
import UpdateDisplayNameForm from "./components/UpdateDisplayNameForm";
import UpdateWorkspaceDescriptionForm from "./components/UpdateWorkspaceDescriptionForm";
import UpdateWorkspaceNameForm from "./components/UpdateWorkspaceNameForm";
import UpdateWorkspaceUrlForm from "./components/UpdateWorkspaceUrlForm";

export default function SettingsPage() {
  const { modalContentType, openModal } = useModal();
  const { workspace } = useWorkspace();
  const utils = api.useUtils();
  const { showPopup } = usePopup();

  const { data } = api.user.getUser.useQuery();

  const {
    data: integrations,
    refetch: refetchIntegrations,
    isLoading: integrationsLoading,
  } = api.integration.providers.useQuery();

  const { data: trelloUrl, refetch: refetchTrelloUrl } =
    api.trello.getAuthorizationUrl.useQuery(undefined, {
      enabled:
        !integrationsLoading &&
        !integrations?.some((integration) => integration.provider === "trello"),
      refetchOnWindowFocus: true,
    });

  useEffect(() => {
    const handleFocus = () => {
      refetchIntegrations();
    };
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [refetchIntegrations]);

  const { mutateAsync: disconnectTrello } = api.trello.disconnect.useMutation({
    onSuccess: () => {
      refetchUser();
      refetchIntegrations();
      refetchTrelloUrl();
      showPopup({
        header: "Trello disconnected",
        message: "Your Trello account has been disconnected.",
        icon: "success",
      });
    },
    onError: () => {
      showPopup({
        header: "Error disconnecting Trello",
        message: "An error occurred while disconnecting your Trello account.",
        icon: "error",
      });
    },
  });

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
                Trello
              </h2>
              {!integrations?.some(
                (integration) => integration.provider === "trello",
              ) && trelloUrl ? (
                <>
                  <p className="mb-8 text-sm text-neutral-500 dark:text-dark-900">
                    Connect your Trello account to import boards.
                  </p>
                  <Button
                    variant="primary"
                    iconRight={<HiMiniArrowTopRightOnSquare />}
                    onClick={() =>
                      window.open(
                        trelloUrl.url,
                        "trello_auth",
                        "height=800,width=600",
                      )
                    }
                  >
                    Connect Trello
                  </Button>
                </>
              ) : (
                <>
                  <p className="mb-8 text-sm text-neutral-500 dark:text-dark-900">
                    You are already connected to Trello.
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => {
                      disconnectTrello();
                    }}
                  >
                    Disconnect Trello
                  </Button>
                </>
              )}
            </div>

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

            <div className="border-t border-light-300 dark:border-dark-300">
              <h2 className="mt-8 text-[14px] text-neutral-900 dark:text-dark-1000">
                Delete workspace
              </h2>
              <p className="mb-8 mt-2 text-sm text-neutral-500 dark:text-dark-900">
                Once you delete your workspace, there is no going back. Please
                be certain.
              </p>
              <Button
                variant="primary"
                onClick={() => openModal("DELETE_WORKSPACE")}
              >
                Delete workspace
              </Button>
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
          </Modal>
        </div>
      </div>
    </>
  );
}
