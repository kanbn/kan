import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { env } from "next-runtime-env";
import { useEffect, useState } from "react";

import { authClient } from "@kan/auth/client";

import { Auth } from "~/components/AuthForm";
import { PageHead } from "~/components/PageHead";
import PatternedBackground from "~/components/PatternedBackground";

export default function PartnerActivatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const licenseKey = searchParams.get("license_key");
  const error = searchParams.get("error");

  const partnerName = env("NEXT_PUBLIC_PARTNER_NAME");

  const { data: session, isPending } = authClient.useSession();
  const [isMagicLinkSent, setIsMagicLinkSent] = useState(false);
  const [magicLinkRecipient, setMagicLinkRecipient] = useState("");

  useEffect(() => {
    if (licenseKey) {
      localStorage.setItem("partnerLicenseKey", licenseKey);
    }
  }, [licenseKey]);

  useEffect(() => {
    if (!isPending && session?.user && licenseKey) {
      router.push(
        `/api/partner/link?license_key=${encodeURIComponent(licenseKey)}`,
      );
    } else if (!isPending && session?.user && !licenseKey) {
      router.push("/boards");
    }
  }, [session, isPending, licenseKey, router]);

  if (isPending || (session?.user && licenseKey)) return null;

  return (
    <>
      <PageHead title={t`Activate | kan.bn`} />
      <main className="h-screen bg-light-100 pt-20 dark:bg-dark-50 sm:pt-0">
        <div className="justify-top flex h-full flex-col items-center px-4 sm:justify-center">
          <div className="z-10 flex w-full flex-col items-center">
            <Link href="/">
              <h1 className="mb-6 text-lg font-bold tracking-tight text-light-1000 dark:text-dark-1000">
                kan.bn
              </h1>
            </Link>
            <p className="mb-2 text-3xl font-bold tracking-tight text-light-1000 dark:text-dark-1000">
              {isMagicLinkSent ? t`Check your inbox` : t`Activate your account`}
            </p>
            <p className="mb-10 text-sm text-light-800 dark:text-dark-800">
              {isMagicLinkSent ? (
                <Trans>We sent a link to {magicLinkRecipient}</Trans>
              ) : partnerName ? (
                <Trans>
                  Sign in or create an account to activate your {partnerName}{" "}
                  license
                </Trans>
              ) : (
                t`Sign in or create an account to activate your license`
              )}
            </p>

            {error && (
              <div className="mb-4 w-full rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400 sm:max-w-md">
                {t`Something went wrong during activation. Please try again.`}
              </div>
            )}

            {!isMagicLinkSent && (
              <div className="w-full rounded-lg border border-light-500 bg-light-300 px-4 py-10 dark:border-dark-400 dark:bg-dark-200 sm:max-w-md lg:px-10">
                <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                  <Auth
                    setIsMagicLinkSent={(val, recipient) => {
                      setIsMagicLinkSent(val);
                      setMagicLinkRecipient(recipient);
                    }}
                    callbackURL={
                      licenseKey
                        ? `/api/partner/link?license_key=${encodeURIComponent(licenseKey)}`
                        : "/boards"
                    }
                  />
                </div>
              </div>
            )}

            <p className="mt-4 text-sm text-light-1000 dark:text-dark-1000">
              <Trans>
                Already have an account?{" "}
                <span className="underline">
                  <Link
                    href={
                      licenseKey
                        ? `/login?next=${encodeURIComponent(`/api/partner/link?license_key=${licenseKey}`)}`
                        : "/login"
                    }
                  >
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
