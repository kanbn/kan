import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { env } from "next-runtime-env";
import { useState } from "react";

import { authClient } from "@kan/auth/client";

import { Auth } from "~/components/AuthForm";
import { PageHead } from "~/components/PageHead";
import PatternedBackground from "~/components/PatternedBackground";

export default function SignUpPage() {
  const router = useRouter();
  const isSignUpDisabled = env("NEXT_PUBLIC_DISABLE_SIGN_UP") === "true";
  const [isMagicLinkSent, setIsMagicLinkSent] = useState<boolean>(false);
  const [magicLinkRecipient, setMagicLinkRecipient] = useState<string>("");

  const redirect = useSearchParams().get("next");

  const { data } = authClient.useSession();

  if (data?.user.id) router.push("/boards");

  const handleMagicLinkSent = (value: boolean, recipient: string) => {
    setIsMagicLinkSent(value);
    setMagicLinkRecipient(recipient);
  };

  if (isSignUpDisabled) {
    return (
      <>
        <PageHead title={t`Sign up | kan.bn`} />
        <main className="h-screen bg-light-100 pt-20 dark:bg-dark-50 sm:pt-0">
          <div className="justify-top flex h-full flex-col items-center px-4 sm:justify-center">
            <div className="z-10 flex w-full flex-col items-center">
              <Link href="/">
                <h1 className="mb-6 text-lg font-bold tracking-tight text-light-1000 dark:text-dark-1000">
                  kan.bn
                </h1>
              </Link>
              <p className="mb-10 text-3xl font-bold tracking-tight text-light-1000 dark:text-dark-1000">
                {t`Sign up disabled`}
              </p>
              <p className="text-md text-center text-light-1000 dark:text-dark-1000">
                {t`Sign up is currently disabled. Please try again later.`}
              </p>
            </div>
            <PatternedBackground />
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <PageHead title={t`Sign up | kan.bn`} />
      <main className="h-screen bg-light-100 pt-20 dark:bg-dark-50 sm:pt-0">
        <div className="justify-top flex h-full flex-col items-center px-4 sm:justify-center">
          <div className="z-10 flex w-full flex-col items-center">
            <Link href="/">
              <h1 className="mb-6 text-lg font-bold tracking-tight text-light-1000 dark:text-dark-1000">
                kan.bn
              </h1>
            </Link>
            <p className="mb-10 text-3xl font-bold tracking-tight text-light-1000 dark:text-dark-1000">
              {isMagicLinkSent ? t`Check your inbox` : t`Get started`}
            </p>
            {isMagicLinkSent ? (
              <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <p className="text-md mt-2 text-center text-light-1000 dark:text-dark-1000">
                  <Trans>
                    Click on the link we've sent to {magicLinkRecipient} to sign
                    in.
                  </Trans>
                </p>
              </div>
            ) : (
              <div className="w-full rounded-lg border border-light-500 bg-light-300 px-4 py-10 dark:border-dark-400 dark:bg-dark-200 sm:max-w-md lg:px-10">
                <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                  <Auth setIsMagicLinkSent={handleMagicLinkSent} isSignUp />
                </div>
              </div>
            )}
            <p className="mt-4 text-sm text-light-1000 dark:text-dark-1000">
              <Trans>
                Already have an account?{" "}
                <span className="underline">
                  <Link href={redirect ? `/login?next=${redirect}` : "/login"}>
                    Sign in
                  </Link>
                </span>
              </Trans>
            </p>
          </div>
          <PatternedBackground />
        </div>
      </main>
    </>
  );
}
