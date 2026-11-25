import { useRouter } from "next/router";
import { t } from "@lingui/core/macro";
import { useEffect, useState } from "react";

import { useAcceptInviteLink, useGetInviteByCode } from "@kan/api-client/hooks";
import { authClient } from "@kan/auth/client";
import { env } from "@kan/shared/env";

import Button from "~/components/Button";
import LoadingSpinner from "~/components/LoadingSpinner";
import { PageHead } from "~/components/PageHead";
import { getApiErrorStatus } from "~/utils/apiError";
import { AuthLayout } from "../auth/components/AuthLayout";

const PageWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <PageHead title={t`Join workspace | kan.bn`} />
      {children}
    </>
  );
};

export default function InvitePage() {
  const router = useRouter();
  const { code } = router.query;
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: session, isPending: isSessionLoading } =
    authClient.useSession();

  const isCloudEnv = env("NEXT_PUBLIC_KAN_ENV") === "cloud";

  const inviteCode = Array.isArray(code) ? code[0] : code;

  const acceptInviteMutation = useAcceptInviteLink({
    mutation: {
      onSuccess: (result) => {
        if (result.data.success) {
          return router.push(
            `/boards?workspacePublicId=${result.data.workspacePublicId}`,
          );
        }
      },
      onError: (error) => {
        const status = getApiErrorStatus(error);

        if (status === 409) {
          return router.push(`/boards`);
        }

        if (
          status === 403 &&
          error instanceof Error &&
          error.message === "SEAT_LIMIT_REACHED"
        ) {
          setError(
            t`This workspace has reached its member limit. The workspace owner will need to upgrade their plan.`,
          );
          setIsProcessing(false);
          return;
        }

        setError(
          (error instanceof Error && error.message) ||
            t`Failed to accept invitation. Please try again later, or contact customer support.`,
        );
        setIsProcessing(false);
      },
    },
  });

  const {
    data: inviteInfo,
    isLoading: isInviteInfoLoading,
    isError: isInviteInfoError,
  } = useGetInviteByCode(inviteCode ?? "", {
    query: { enabled: !!inviteCode, retry: false },
  });

  useEffect(() => {
    if (session?.user.id && inviteCode && inviteInfo && !error) {
      setIsProcessing(true);
      setError(null);

      acceptInviteMutation.mutate({
        data: { inviteCode },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id, inviteCode, inviteInfo, error]);

  if (
    !isInviteInfoError &&
    !error &&
    (session?.user.id || isInviteInfoLoading || isSessionLoading)
  ) {
    return (
      <>
        <PageHead title={t`Join workspace`} />
        <div className="flex min-h-screen items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </>
    );
  }

  if (isInviteInfoError || (!isInviteInfoLoading && !inviteInfo)) {
    return (
      <PageWrapper>
        <AuthLayout title={t`Invalid invitation`}>
          <p className="mb-6 text-center text-sm text-light-900 dark:text-dark-900">
            {t`This invitation link is invalid or has expired.`}
          </p>
          <div className="text-center">
            <Button href="/" size="sm">
              {t`Go Home`}
            </Button>
          </div>
        </AuthLayout>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <AuthLayout title={t`Join workspace`}>
        {!error ? (
          <p className="mb-6 text-center text-sm text-light-900 dark:text-dark-900">
            {isCloudEnv
              ? t`You've been invited to join a workspace on kan.bn.`
              : t`You've been invited to join a workspace.`}
          </p>
        ) : (
          <p className="mb-6 text-center text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        {session?.user.id ? (
          <Button href={`/boards`} fullWidth>
            {t`Go to app`}
          </Button>
        ) : (
          <div className="space-y-2">
            <Button
              href={`/signup?next=/invite/${inviteCode}`}
              disabled={isProcessing}
              fullWidth
            >
              {t`Sign Up`}
            </Button>
            <Button
              href={`/login?next=/invite/${inviteCode}`}
              disabled={isProcessing}
              variant="secondary"
              fullWidth
            >
              {t`Sign In`}
            </Button>
          </div>
        )}
      </AuthLayout>
    </PageWrapper>
  );
}
