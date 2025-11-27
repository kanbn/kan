import { useRouter } from "next/router";
import { t } from "@lingui/core/macro";
import { useEffect, useState } from "react";

import Button from "~/components/Button";
import { PageHead } from "~/components/PageHead";
import PatternedBackground from "~/components/PatternedBackground";

type UnsubscribeStatus = "idle" | "processing" | "success" | "error";

export default function UnsubscribePage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<UnsubscribeStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!router.isReady) return;
    const value = router.query.token;
    if (typeof value === "string") {
      setToken(value);
    } else if (Array.isArray(value)) {
      setToken(value[0] ?? "");
    } else {
      setToken("");
    }
  }, [router.isReady, router.query.token]);

  const handleUnsubscribe = async () => {
    if (!token) {
      setStatus("error");
      setErrorMessage(
        t`Your unsubscribe link is missing a token. Please open the latest email and try again.`,
      );
      return;
    }

    setStatus("processing");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        throw new Error(
          payload?.error ??
            "We couldn't update your preferences. Please try again.",
        );
      }

      setStatus("success");
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        t`We couldn't update your preferences. Please try again.`,
      );
    }
  };

  const title = t`Unsubscribe`;

  return (
    <>
      <PageHead title={`${title} | kan.bn`} />
      <div className="relative flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <PatternedBackground />
        <div className="z-10 w-full max-w-md space-y-6">
          <div>
            <h1 className="mt-6 text-center text-3xl font-bold tracking-tight text-light-1000 dark:text-dark-1000">
              {t`Do you want to unsubscribe?`}
            </h1>
            <p className="mt-4 text-center text-sm text-light-900 dark:text-dark-800">
              {t`Confirm your email preferences:`}
            </p>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={handleUnsubscribe}
              disabled={status === "success"}
              isLoading={status === "processing"}
              variant="primary"
              size="md"
            >
              {t`Unsubscribe`}
            </Button>
          </div>
          {status === "success" && (
            <p className="text-center text-sm text-light-900 dark:text-dark-800">
              {t`You have been unsubscribed!`}
            </p>
          )}
          {status === "error" && (
            <p className="mx-auto max-w-[300px] text-center text-sm font-medium text-red-600 dark:text-red-400">
              {errorMessage}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
