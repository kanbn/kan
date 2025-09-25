import { useRouter } from "next/router";
import { t } from "@lingui/core/macro";
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
  const [invitationInfo, setInvitationInfo] = useState<any>(null);
  const { data: session, isPending: isSessionLoading } =
    authClient.useSession();
  const { switchWorkspace } = useWorkspace();

  const acceptInviteMutation = api.member.acceptInviteLink.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        router.push(`/boards`);
      }
    },
    onError: (error) => {
      setError(error.message || t`Failed to accept invitation`);
      setIsProcessing(false);
    },
  });

  const {
    data: inviteInfo,
    isLoading: isInviteInfoLoading,
    isError: isInviteInfoError,
    error: inviteInfoError,
  } = api.member.getInviteByCode.useQuery({ inviteCode: code ?? "" });

  // Set invite info when loaded
  useEffect(() => {
    if (inviteInfo) {
      setInvitationInfo(inviteInfo);
    } else if (isInviteInfoError) {
      setError(t`Invalid or expired invitation link`);
    }
  }, [inviteInfo, isInviteInfoError]);

  // Auto accept invite if user is logged in
  useEffect(() => {
    if (session?.user.id && code && typeof code === "string" && inviteInfo) {
      handleAcceptInvite();
    }
  }, [session, code, inviteInfo]);

  const handleAcceptInvite = async () => {
    if (!code || typeof code !== "string" || !session?.user.id) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    acceptInviteMutation.mutate({
      inviteCode: code,
      userId: session.user.id,
    });
  };

  if (session?.user.id || isInviteInfoLoading || isSessionLoading) {
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

  if (isInviteInfoError || !inviteInfo) {
    return (
      <>
        <PageHead title={t`Join workspace`} />
        <div className="relative flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
          <PatternedBackground />
          <div className="w-full max-w-md space-y-8">
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
      </>
    );
  }

  return (
    <>
      <PageHead title={t`Join workspace`} />

      <div className="relative flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <PatternedBackground />
        <div className="z-10 w-full max-w-md space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-light-1000 dark:text-dark-1000">
              {t`Join workspace`}
            </h2>
            <p className="mt-4 text-center text-sm text-light-600 dark:text-dark-800">
              {t`You've been invited to join ${invitationInfo?.workspaceName || "a workspace"} on kan.bn`}
            </p>
          </div>

          <div className="flex justify-center gap-2">
            <Button
              href={`/login?next=/invite/${code}`}
              disabled={isProcessing}
              variant="primary"
              size="md"
            >
              {t`Sign In`}
            </Button>
            <Button
              href={`/signup?next=/invite/${code}`}
              disabled={isProcessing}
              variant="primary"
              size="md"
            >
              {t`Sign Up`}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
