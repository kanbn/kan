import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { HiMiniArrowTopRightOnSquare } from "react-icons/hi2";
import { z } from "zod";

import {
  useDisconnectGitHub,
  useDisconnectIntegration,
  useGetGitHubStatus,
  useGetIntegrationAuthorizationUrl,
  useGetIntegrationProviders,
  useSaveGitHubToken,
} from "@kan/api-client/hooks";

import Button from "~/components/Button";
import FeedbackModal from "~/components/FeedbackModal";
import Input from "~/components/Input";
import Modal from "~/components/modal";
import { NewWorkspaceForm } from "~/components/NewWorkspaceForm";
import { PageHead } from "~/components/PageHead";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";

const githubTokenSchema = z.object({
  token: z.string().min(1, { message: t`Token is required` }),
});

type GitHubTokenFormValues = z.infer<typeof githubTokenSchema>;

export default function IntegrationsSettings() {
  const { modalContentType, isOpen } = useModal();
  const { showPopup } = usePopup();

  const {
    register,
    handleSubmit,
    formState: { isDirty, errors },
    reset,
  } = useForm<GitHubTokenFormValues>({
    resolver: zodResolver(githubTokenSchema),
    defaultValues: {
      token: "",
    },
  });

  const {
    data: integrations,
    refetch: refetchIntegrations,
    isLoading: integrationsLoading,
  } = useGetIntegrationProviders({ query: { select: (res) => res.data } });

  const { data: trelloUrl, refetch: refetchTrelloUrl } =
    useGetIntegrationAuthorizationUrl(
      { provider: "trello" },
      {
        query: {
          enabled:
            !integrationsLoading &&
            !integrations?.some(
              (integration) => integration.provider === "trello",
            ),
          refetchOnWindowFocus: true,
          select: (res) => res.data,
        },
      },
    );

  const { data: githubStatus, refetch: refetchGithubStatus } =
    useGetGitHubStatus({ query: { select: (res) => res.data } });

  useEffect(() => {
    const handleFocus = () => {
      void refetchIntegrations();
      void refetchGithubStatus();
    };
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [refetchIntegrations, refetchGithubStatus]);

  const { mutateAsync: disconnectTrello } = useDisconnectIntegration({
    mutation: {
      onSuccess: () => {
        void refetchIntegrations();
        void refetchTrelloUrl();
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
    },
  });

  const { mutateAsync: saveGithubToken, isPending: isSavingGithubToken } =
    useSaveGitHubToken({
      mutation: {
        onSuccess: () => {
          void refetchGithubStatus();
          reset();
          showPopup({
            header: t`GitHub connected`,
            message: t`Your GitHub account has been connected.`,
            icon: "success",
          });
        },
        onError: () => {
          showPopup({
            header: t`Error connecting GitHub`,
            message: t`An error occurred while connecting your GitHub account.`,
            icon: "error",
          });
        },
      },
    });

  const onSubmitGithubToken = (data: GitHubTokenFormValues) => {
    void saveGithubToken({ data: { token: data.token } });
  };

  const { mutateAsync: disconnectGithub } = useDisconnectGitHub({
    mutation: {
      onSuccess: () => {
        void refetchGithubStatus();
        showPopup({
          header: t`GitHub disconnected`,
          message: t`Your GitHub account has been disconnected.`,
          icon: "success",
        });
      },
      onError: () => {
        showPopup({
          header: t`Error disconnecting GitHub`,
          message: t`An error occurred while disconnecting your GitHub account.`,
          icon: "error",
        });
      },
    },
  });

  return (
    <>
      <PageHead title={t`Settings | Integrations`} />

      <div className="mb-8 border-t border-light-300 dark:border-dark-300">
        <h2 className="mt-8 mb-4 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
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
                onClick={() =>
                  disconnectTrello({ data: { provider: "trello" } })
                }
              >
                {t`Disconnect Trello`}
              </Button>
            </>
          )
        )}
      </div>

      <div className="mb-8 border-t border-light-300 dark:border-dark-300">
        <h2 className="mt-8 mb-4 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
          {t`GitHub`}
        </h2>
        {!githubStatus?.connected ? (
          <>
            <p className="mb-4 text-sm text-neutral-500 dark:text-dark-900">
              {t`Connect your GitHub account to import projects.`}
            </p>
            <form
              onSubmit={handleSubmit(onSubmitGithubToken)}
              className="flex gap-2"
            >
              <div className="mb-4 flex w-full max-w-[325px] items-center gap-2">
                <Input
                  type="password"
                  placeholder="Personal Access Token"
                  {...register("token")}
                  errorMessage={errors.token?.message}
                />
              </div>
              <div>
                <Button
                  variant="secondary"
                  type="submit"
                  disabled={!isDirty || isSavingGithubToken}
                  isLoading={isSavingGithubToken}
                >
                  {t`Connect GitHub`}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            <p className="mb-8 text-sm text-neutral-500 dark:text-dark-900">
              {t`Your GitHub account is connected.`}
            </p>
            <Button variant="secondary" onClick={() => disconnectGithub()}>
              {t`Disconnect GitHub`}
            </Button>
          </>
        )}
      </div>

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
