import { useRouter } from "next/router";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
} from "@headlessui/react";
import { t } from "@lingui/core/macro";
import { env } from "next-runtime-env";
import { useEffect, useRef, useState } from "react";
import {
  HiBolt,
  HiChevronDown,
  HiMiniArrowTopRightOnSquare,
  HiOutlineBanknotes,
  HiOutlineCodeBracketSquare,
  HiOutlineRectangleGroup,
  HiOutlineUser,
} from "react-icons/hi2";

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
import ApiKeyList from "./components/ApiKeyList";
import Avatar from "./components/Avatar";
import { ChangePasswordFormConfirmation } from "./components/ChangePasswordConfirmation";
import { DeleteAccountConfirmation } from "./components/DeleteAccountConfirmation";
import { DeleteWorkspaceConfirmation } from "./components/DeleteWorkspaceConfirmation";
import NewApiKeyModal from "./components/NewApiKeyModal";
import { RevokeApiKeyConfirmation } from "./components/RevokeApiKeyConfirmation";
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
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
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

  const settingsTabs = [
    {
      key: "account",
      icon: <HiOutlineUser />,
      label: t`Account`,
      condition: true,
      content: () => (
        <>
          <PageHead title="Settings | Account" />

          <div className="mb-8 border-t border-light-300 dark:border-dark-300">
            <h2 className="mb-4 mt-8 text-[14px] text-neutral-900 dark:text-dark-1000">
              {t`Profile picture`}
            </h2>
            <Avatar userId={data?.id} userImage={data?.image} />

            <div className="mb-4">
              <h2 className="mb-4 mt-8 text-[14px] text-neutral-900 dark:text-dark-1000">
                {t`Display name`}
              </h2>
              <UpdateDisplayNameForm displayName={data?.name ?? ""} />
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
        </>
      ),
    },
    {
      key: "workspace",
      icon: <HiOutlineRectangleGroup />,
      label: t`Workspace`,
      condition: true,
      content: () => (
        <>
          <PageHead title={`Settings | ${workspace.name ?? "Workspace"}`} />

          <div className="mb-8 border-t border-light-300 dark:border-dark-300">
            <h2 className="mb-4 mt-8 text-[14px] text-neutral-900 dark:text-dark-1000">
              {t`Workspace name`}
            </h2>
            <UpdateWorkspaceNameForm
              workspacePublicId={workspace.publicId}
              workspaceName={workspace.name}
            />

            <h2 className="mb-4 mt-8 text-[14px] text-neutral-900 dark:text-dark-1000">
              {t`Workspace URL`}
            </h2>
            <UpdateWorkspaceUrlForm
              workspacePublicId={workspace.publicId}
              workspaceUrl={workspace.slug ?? ""}
              workspacePlan={workspace.plan ?? "free"}
            />

            <h2 className="mb-4 mt-8 text-[14px] text-neutral-900 dark:text-dark-1000">
              {t`Workspace description`}
            </h2>
            <UpdateWorkspaceDescriptionForm
              workspacePublicId={workspace.publicId}
              workspaceDescription={workspace.description ?? ""}
            />

            {env("NEXT_PUBLIC_KAN_ENV") === "cloud" &&
              !hasActiveSubscription(subscriptions, "pro") && (
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
          </div>
        </>
      ),
    },
    {
      key: "billing",
      label: t`Billing`,
      icon: <HiOutlineBanknotes />,
      condition: env("NEXT_PUBLIC_KAN_ENV") === "cloud",
      content: () => (
        <>
          <PageHead title="Settings | Billing" />

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
        </>
      ),
    },
    {
      key: "api",
      icon: <HiOutlineCodeBracketSquare />,
      label: t`API`,
      condition: true,
      content: () => (
        <>
          <PageHead title="Settings | API" />

          <div className="mb-8 border-t border-light-300 dark:border-dark-300">
            <h2 className="mb-4 mt-8 text-[14px] text-neutral-900 dark:text-dark-1000">
              {t`API keys`}
            </h2>
            <p className="mb-8 text-sm text-neutral-500 dark:text-dark-900">
              {t`View and manage your API keys.`}
            </p>

            <div className="mb-4 flex items-center justify-between">
              <Button
                variant="primary"
                onClick={() => openModal("NEW_API_KEY")}
              >
                {t`Create new key`}
              </Button>
            </div>

            <ApiKeyList />
          </div>
        </>
      ),
    },
    {
      key: "integrations",
      icon: <HiOutlineCodeBracketSquare />,
      label: t`Integrations`,
      condition: true,
      content: () => (
        <>
          <PageHead title="Settings | Integrations" />

          <div className="mb-8 border-t border-light-300 dark:border-dark-300">
            <h2 className="mb-4 mt-8 text-[14px] text-neutral-900 dark:text-dark-1000">
              {t`Trello`}
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
        </>
      ),
    },
  ];

  const availableTabs = settingsTabs.filter((tab) => tab.condition);

  useEffect(() => {
    const tabParam = router.query.tab as string;
    if (tabParam) {
      const tabIndex = availableTabs.findIndex((tab) => tab.key === tabParam);
      if (tabIndex !== -1) {
        setSelectedTabIndex(tabIndex);
      }
    }
  }, [router.query.tab, availableTabs]);

  // Update URL when tab changes
  const handleTabChange = (index: number) => {
    const tabKey = availableTabs[index]?.key;
    if (tabKey) {
      void router.push(
        {
          pathname: router.pathname,
          query: { ...router.query, tab: tabKey },
        },
        undefined,
        { shallow: true },
      );
    }
    setSelectedTabIndex(index);
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

            <TabGroup
              selectedIndex={selectedTabIndex}
              onChange={handleTabChange}
            >
              <div className="sm:hidden">
                {/* Mobile dropdown */}
                <Listbox value={selectedTabIndex} onChange={handleTabChange}>
                  <div className="relative">
                    <ListboxButton className="w-full appearance-none rounded-md bg-white py-2 pl-3 pr-8 text-left text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:bg-gray-900 dark:text-gray-100 dark:outline-white/10 dark:focus:outline-indigo-500">
                      {settingsTabs.filter((tab) => tab.condition)[
                        selectedTabIndex
                      ]?.label || "Select a tab"}
                      <HiChevronDown
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-y-0 right-0 flex size-5 items-center pr-2 text-gray-500 dark:text-gray-400"
                      />
                    </ListboxButton>
                    <ListboxOptions className="absolute z-10 mt-1 w-full rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-800 dark:ring-white/20">
                      {settingsTabs.map(
                        (tab) =>
                          tab.condition && (
                            <ListboxOption
                              key={tab.key}
                              value={settingsTabs
                                .filter((t) => t.condition)
                                .indexOf(tab)}
                              className="relative cursor-pointer select-none py-2 pl-3 pr-9 text-gray-900 data-[focus]:bg-indigo-600 data-[focus]:text-white dark:text-gray-100 dark:data-[focus]:bg-indigo-500"
                            >
                              {tab.label}
                            </ListboxOption>
                          ),
                      )}
                    </ListboxOptions>
                  </div>
                </Listbox>
              </div>
              <div className="hidden sm:block">
                <div className="border-b border-gray-200 dark:border-white/10">
                  <TabList
                    as="nav"
                    aria-label="Tabs"
                    className="-mb-px flex space-x-8"
                  >
                    {settingsTabs.map(
                      (tab) =>
                        tab.condition && (
                          <Tab
                            key={tab.key}
                            className="whitespace-nowrap border-b-2 border-transparent px-1 py-4 text-sm font-medium text-light-900 data-[selected]:border-light-1000 data-[selected]:text-light-1000 hover:border-light-950 hover:text-light-950 data-[selected]:hover:border-light-1000 data-[selected]:hover:text-light-1000 focus:outline-none dark:text-dark-900 dark:data-[selected]:border-dark-1000 dark:data-[selected]:text-dark-1000 dark:hover:border-white/20 dark:hover:text-dark-950 dark:data-[selected]:hover:border-dark-1000 dark:data-[selected]:hover:text-dark-1000"
                          >
                            {tab.label}
                          </Tab>
                        ),
                    )}
                  </TabList>
                </div>
              </div>
              <TabPanels>
                {settingsTabs.map(
                  (tab) =>
                    tab.condition && (
                      <TabPanel key={tab.key}>
                        <tab.content />
                      </TabPanel>
                    ),
                )}
              </TabPanels>
            </TabGroup>
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
        <Modal
          modalSize="sm"
          isVisible={isOpen && modalContentType === "NEW_API_KEY"}
        >
          <NewApiKeyModal />
        </Modal>
        <Modal
          modalSize="sm"
          isVisible={isOpen && modalContentType === "REVOKE_API_KEY"}
        >
          <RevokeApiKeyConfirmation />
        </Modal>
      </>
    </>
  );
}
