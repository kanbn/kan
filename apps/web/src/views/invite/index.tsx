import { useRouter } from "next/router";
import { t } from "@lingui/core/macro";
import { env } from "next-runtime-env";
import { useEffect, useState } from "react";

import { authClient } from "@kan/auth/client";

import Button from "~/components/Button";
import LoadingSpinner from "~/components/LoadingSpinner";
import { PageHead } from "~/components/PageHead";
import PatternedBackground from "~/components/PatternedBackground";
import { api } from "~/utils/api";

export default function InvitePage() {
  const router = useRouter();
  const { code } = router.query;
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: session, isPending: isSessionLoading } =
    authClient.useSession();

  const isCloudEnv = env("NEXT_PUBLIC_KAN_ENV") === "cloud";

  const inviteCode = Array.isArray(code) ? code[0] : code;

  const acceptInviteMutation = api.member.acceptInviteLink.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        return router.push(
          `/boards?workspacePublicId=${result.workspacePublicId}`,
        );
      }
    },
    onError: (error) => {
      if (error.data?.code === "CONFLICT") {
        return router.push(`/boards`);
      }

      setError(
        error.message ||
          t`Failed to accept invitation. Please try again later, or contact customer support.`,
      );
      setIsProcessing(false);
    },
  });

  const {
    data: inviteInfo,
    isLoading: isInviteInfoLoading,
    isError: isInviteInfoError,
  } = api.member.getInviteByCode.useQuery(
    { inviteCode: inviteCode ?? "" },
    {
      enabled: !!inviteCode,
      retry: false,
    },
  );

  // Auto accept invite if user is logged in
  useEffect(() => {
    if (session?.user.id && inviteCode && inviteInfo && !error) {
      setIsProcessing(true);
      setError(null);

      acceptInviteMutation.mutate({
        inviteCode,
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
        <PatternedBackground />
        <div className="flex min-h-screen items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </>
    );
  }

  const PageWrapper = ({ children }: { children: React.ReactNode }) => {
    return (
      <>
        <PageHead title={t`Join workspace | kan.bn`} />
        {children}
      </>
    );
  };

  if (isInviteInfoError || (!isInviteInfoLoading && !inviteInfo)) {
    return (
      <PageWrapper>
        <div className="relative flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
          <PatternedBackground />
          <div className="z-10 w-full max-w-md space-y-8">
            <div>
              <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-light-1000 dark:text-dark-1000">
                {t`Invalid invitation`}
              </h2>
              <p className="mt-4 text-center text-sm text-light-600 dark:text-dark-800">
                {t`This invitation link is invalid or has expired.`}
              </p>
            </div>
            <div className="text-center">
              <Button href="/" variant="primary">
                {t`Go Home`}
              </Button>
            </div>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="relative flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <PatternedBackground />
        <div className="z-10 w-full max-w-[400px] space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-light-1000 dark:text-dark-1000">
              {t`Join workspace`}
            </h2>
            {!error ? (
              <p className="mt-4 text-center text-sm text-light-600 dark:text-dark-800">
                {isCloudEnv
                  ? t`You've been invited to join a workspace on kan.bn.`
                  : t`You've been invited to join a workspace.`}
              </p>
            ) : (
              <p className="mt-4 text-center text-sm text-red-500">{error}</p>
            )}
          </div>
          <div className="flex justify-center gap-2">
            {session?.user.id ? (
              <Button href={`/boards`} variant="primary" size="md">
                {t`Go to app`}
              </Button>
            ) : (
              <>
                <Button
                  href={`/login?next=/invite/${inviteCode}`}
                  disabled={isProcessing}
                  variant="primary"
                  size="md"
                >
                  {t`Sign In`}
                </Button>
                <Button
                  href={`/signup?next=/invite/${inviteCode}`}
                  disabled={isProcessing}
                  variant="primary"
                  size="md"
                >
                  {t`Sign Up`}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
