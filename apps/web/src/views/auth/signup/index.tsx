import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useState } from "react";

import { authClient } from "@kan/auth/client";
import { env } from "@kan/shared/env";

import type { SocialProvidersProps } from "~/utils/social-providers";
import { Auth } from "~/components/AuthForm";
import { PageHead } from "~/components/PageHead";
import { AuthLayout } from "../components/AuthLayout";

export default function SignUpPage({ socialProviders }: SocialProvidersProps) {
  const router = useRouter();
  const isSignUpDisabled = env("NEXT_PUBLIC_DISABLE_SIGN_UP") === "true";
  const [isMagicLinkSent, setIsMagicLinkSent] = useState<boolean>(false);
  const [magicLinkRecipient, setMagicLinkRecipient] = useState<string>("");

  const redirect = useSearchParams().get("next");

  const { data } = authClient.useSession();

  if (data?.user.id) router.push(redirect ?? "/boards");

  const handleMagicLinkSent = (value: boolean, recipient: string) => {
    setIsMagicLinkSent(value);
    setMagicLinkRecipient(recipient);
  };

  const isInviteFlow = redirect?.startsWith("/invite/");

  if (isSignUpDisabled && !isInviteFlow) {
    return (
      <>
        <PageHead title={t`Sign up | kan.bn`} />
        <AuthLayout title={t`Sign up disabled`}>
          <p className="text-center text-sm text-light-900 dark:text-dark-900">
            {t`Sign up is currently disabled. Please try again later.`}
          </p>
        </AuthLayout>
      </>
    );
  }

  return (
    <>
      <PageHead title={t`Sign up | kan.bn`} />
      <AuthLayout
        title={isMagicLinkSent ? t`Check your inbox` : t`Get started`}
        footer={
          <Trans>
            Already have an account?{" "}
            <span className="font-medium text-light-1000 hover:underline dark:text-dark-1000">
              <Link href={redirect ? `/login?next=${redirect}` : "/login"}>
                Sign in
              </Link>
            </span>
          </Trans>
        }
      >
        {isMagicLinkSent ? (
          <p className="text-center text-sm text-light-900 dark:text-dark-900">
            <Trans>
              Click on the link we've sent to {magicLinkRecipient} to sign in.
            </Trans>
          </p>
        ) : (
          <Auth
            setIsMagicLinkSent={handleMagicLinkSent}
            socialProviders={socialProviders}
            isSignUp
          />
        )}
      </AuthLayout>
    </>
  );
}
