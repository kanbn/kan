import { useRouter } from "next/router";
import { t } from "@lingui/core/macro";
import { env } from "next-runtime-env";
import { useEffect, useRef, useState } from "react";
import { HiBolt, HiMiniArrowTopRightOnSquare } from "react-icons/hi2";

import type { Subscription } from "@kan/shared/utils";
import { hasActiveSubscription } from "@kan/shared/utils";

import Button from "~/components/Button";
import FeedbackModal from "~/components/FeedbackModal";
import { LanguageSelector } from "~/components/LanguageSelector";
import Modal from "~/components/modal";
import { NewWorkspaceForm } from "~/components/NewWorkspaceForm";
import { PageHead } from "~/components/PageHead";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import Avatar from "./components/Avatar";
import { ChangePasswordFormConfirmation } from "./components/ChangePasswordConfirmation";
import CreateAPIKeyForm from "./components/CreateAPIKeyForm";
import { DeleteAccountConfirmation } from "./components/DeleteAccountConfirmation";
import { DeleteWorkspaceConfirmation } from "./components/DeleteWorkspaceConfirmation";
import UpdateDisplayNameForm from "./components/UpdateDisplayNameForm";
import UpdateWorkspaceDescriptionForm from "./components/UpdateWorkspaceDescriptionForm";
import UpdateWorkspaceNameForm from "./components/UpdateWorkspaceNameForm";
import UpdateWorkspaceUrlForm from "./components/UpdateWorkspaceUrlForm";
import { UpgradeToProConfirmation } from "./components/UpgradeToProConfirmation";

export default function SettingsPage() {
  const { modalContentType, openModal, isOpen } = useModal();
  const { workspace } = useWorkspace();
  const utils = api.useUtils();
  const { showPopup } = usePopup();
  const router = useRouter();
  const workspaceUrlSectionRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [hasOpenedUpgradeModal, setHasOpenedUpgradeModal] = useState(false);
  const isCredentialsEnabled =
    env("NEXT_PUBLIC_ALLOW_CREDENTIALS")?.toLowerCase() === "true";
  const { data } = api.user.getUser.useQuery();

  const { data: workspaceData } = api.workspace.byId.useQuery({
    workspacePublicId: workspace.publicId,
  });

  const subscriptions = workspaceData?.subscriptions as
    | Subscription[]
    | undefined;

  const {
    data: integrations,
    refetch: refetchIntegrations,
    isLoading: integrationsLoading,
  } = api.integration.providers.useQuery();

  const { data: trelloUrl, refetch: refetchTrelloUrl } =
    api.integration.getAuthorizationUrl.useQuery(
      { provider: "trello" },
      {
        enabled:
          !integrationsLoading &&
          !integrations?.some(
            (integration) => integration.provider === "trello",
          ),
        refetchOnWindowFocus: true,
      },
    );

  useEffect(() => {
    const handleFocus = () => {
      refetchIntegrations();
    };
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [refetchIntegrations]);

  useEffect(() => {
    if (
      router.query.edit === "workspace_url" &&
      workspaceUrlSectionRef.current &&
      scrollContainerRef.current
    ) {
      const element = workspaceUrlSectionRef.current;
      const container = scrollContainerRef.current;

      container.scrollTop = element.offsetTop - 40;

      const input = element.querySelector('input[type="text"]');
      if (input instanceof HTMLInputElement) {
        input.focus();
      }
    }
  }, [router.query.edit]);

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

  const { mutateAsync: disconnectTrello } =
    api.integration.disconnect.useMutation({
      onSuccess: () => {
        refetchUser();
        refetchIntegrations();
        refetchTrelloUrl();
        showPopup({
          header: t`Trello disconnected`,
          message: t`Your Trello account has been disconnected.`,
          icon: "success",
        });
      },
      onError: () => {
        showPopup({
          header: t`Error disconnecting Trello`,
          message: t`An error occurred while disconnecting your Trello account.`,
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
        <div
          ref={scrollContainerRef}
          className="h-full max-h-[calc(100vdh-3rem)] overflow-y-auto md:max-h-[calc(100vdh-4rem)]"
        >
          <PageHead title={t`Settings | ${workspace.name ?? "Workspace"}`} />
          <div className="m-auto max-w-[1100px] px-5 py-6 md:px-28 md:py-12">
            <div className="mb-8 flex w-full justify-between">
              <h1 className="font-bold tracking-tight text-neutral-900 dark:text-dark-1000 sm:text-[1.2rem]">
                {t`Settings`}
              </h1>
            </div>

            <div className="mb-8 border-t border-light-300 dark:border-dark-300">
              <h2 className="mb-4 mt-8 text-[14px] text-neutral-900 dark:text-dark-1000">
                {t`Profile picture`}
              </h2>
              <Avatar userId={data?.id} userImage={data?.image} />

              <h2 className="mb-4 mt-8 text-[14px] text-neutral-900 dark:text-dark-1000">
                {t`Display name`}
              </h2>
              <UpdateDisplayNameForm displayName={data?.name ?? ""} />
            </div>

            <div className="mb-8 border-t border-light-300 dark:border-dark-300">
              <h2 className="mb-4 mt-8 text-[14px] text-neutral-900 dark:text-dark-1000">
                {t`Workspace name`}
              </h2>
              <UpdateWorkspaceNameForm
                workspacePublicId={workspace.publicId}
                workspaceName={workspace.name}
              />

              <div ref={workspaceUrlSectionRef}>
                <h2 className="mb-4 mt-8 text-[14px] text-neutral-900 dark:text-dark-1000">
                  {t`Workspace URL`}
                </h2>
                <UpdateWorkspaceUrlForm
                  workspacePublicId={workspace.publicId}
                  workspaceUrl={workspace.slug ?? ""}
                  workspacePlan={workspace.plan ?? "free"}
                />
              </div>

              <h2 className="mb-4 mt-8 text-[14px] text-neutral-900 dark:text-dark-1000">
                {t`Workspace description`}
              </h2>
              <UpdateWorkspaceDescriptionForm
                workspacePublicId={workspace.publicId}
                workspaceDescription={workspace.description ?? ""}
              />

              {env("NEXT_PUBLIC_KAN_ENV") === "cloud" &&
                !hasActiveSubscription(subscriptions, "pro") && (
                  <div className="mt-8">
                    <Button
                      onClick={() => openModal("UPGRADE_TO_PRO")}
                      iconRight={<HiBolt />}
                    >
                      {t`Upgrade to Pro`}
                    </Button>
                  </div>
                )}
            </div>

            <div className="mb-8 border-t border-light-300 dark:border-dark-300">
              <h2 className="mb-4 mt-8 text-[14px] text-neutral-900 dark:text-dark-1000">
                {t`Language`}
              </h2>
              <p className="mb-8 text-sm text-neutral-500 dark:text-dark-900">
                {t`Change the language of the app.`}
              </p>
              <LanguageSelector />
            </div>

            {env("NEXT_PUBLIC_KAN_ENV") === "cloud" && (
              <div className="mb-8 border-t border-light-300 dark:border-dark-300">
                <h2 className="mb-4 mt-8 text-[14px] text-neutral-900 dark:text-dark-1000">
                  {t`Billing`}
                </h2>
                <p className="mb-8 text-sm text-neutral-500 dark:text-dark-900">
                  {t`View and manage your billing and subscription.`}
                </p>
                <Button
                  variant="primary"
                  iconRight={<HiMiniArrowTopRightOnSquare />}
                  onClick={handleOpenBillingPortal}
                >
                  {t`Billing portal`}
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
                    {t`Connect your Trello account to import boards.`}
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
                    {t`Connect Trello`}
                  </Button>
                </>
              ) : (
                integrations?.some(
                  (integration) => integration.provider === "trello",
                ) && (
                  <>
                    <p className="mb-8 text-sm text-neutral-500 dark:text-dark-900">
                      {t`Your Trello account is connected.`}
                    </p>
                    <Button
                      variant="secondary"
                      onClick={() => disconnectTrello({ provider: "trello" })}
                    >
                      {t`Disconnect Trello`}
                    </Button>
                  </>
                )
              )}
            </div>

            <div className="mb-8 border-t border-light-300 dark:border-dark-300">
              <h2 className="mb-4 mt-8 text-[14px] text-neutral-900 dark:text-dark-1000">
                {t`API keys`}
              </h2>
              <p className="mb-8 text-sm text-neutral-500 dark:text-dark-900">
                {t`View and manage your API keys.`}
              </p>
              <CreateAPIKeyForm
                apiKey={data?.apiKey}
                refetchUser={refetchUser}
              />
            </div>

            <div className="mb-8 border-t border-light-300 dark:border-dark-300">
              <h2 className="mb-4 mt-8 text-[14px] text-neutral-900 dark:text-dark-1000">
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

            {isCredentialsEnabled && (
              <div className="mb-8 border-t border-light-300 dark:border-dark-300">
                <h2 className="mb-4 mt-8 text-[14px] text-neutral-900 dark:text-dark-1000">
                  {t`Change Password`}
                </h2>
                <p className="mb-8 text-sm text-neutral-500 dark:text-dark-900">
                  {t`You are about to change your password.`}
                </p>
                <div className="mt-4">
                  <Button
                    variant="secondary"
                    onClick={() => openModal("CHANGE_PASSWORD")}
                  >
                    {t`Change Password`}
                  </Button>
                </div>
              </div>
            )}

            <div className="mb-8 border-t border-light-300 dark:border-dark-300">
              <h2 className="mb-4 mt-8 text-[14px] text-neutral-900 dark:text-dark-1000">
                {t`Delete account`}
              </h2>
              <p className="mb-8 text-sm text-neutral-500 dark:text-dark-900">
                {t`Once you delete your account, there is no going back. This action cannot be undone.`}
              </p>
              <div className="mt-4">
                <Button
                  variant="secondary"
                  onClick={() => openModal("DELETE_ACCOUNT")}
                >
                  {t`Delete account`}
                </Button>
              </div>
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
              isVisible={isOpen && modalContentType === "NEW_WORKSPACE"}
            >
              <NewWorkspaceForm />
            </Modal>

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

            <Modal
              modalSize="sm"
              isVisible={isOpen && modalContentType === "DELETE_ACCOUNT"}
            >
              <DeleteAccountConfirmation />
            </Modal>

            <Modal
              modalSize="sm"
              isVisible={isOpen && modalContentType === "CHANGE_PASSWORD"}
            >
              <ChangePasswordFormConfirmation />
            </Modal>
          </>
        </div>
      </div>
    </>
  );
}
