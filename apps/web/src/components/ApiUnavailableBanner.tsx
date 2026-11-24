import { t } from "@lingui/core/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { env } from "@kan/shared/env";

const errorCode = (error: unknown) =>
  (error as { data?: { code?: string } } | null)?.data?.code;

export function ApiUnavailableBanner() {
  const queryClient = useQueryClient();
  const [unavailable, setUnavailable] = useState(false);

  useEffect(
    () =>
      queryClient.getQueryCache().subscribe(({ query }) => {
        if (errorCode(query.state.error) === "API_UNAVAILABLE")
          setUnavailable(true);
        else if (query.state.status === "success") setUnavailable(false);
      }),
    [queryClient],
  );

  if (!unavailable) return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-0 z-50 border-b border-red-300 bg-red-50 px-4 py-3 text-center text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
    >
      {t`Kan can't reach its API service.`}{" "}
      {env("NEXT_PUBLIC_KAN_ENV") !== "cloud" && (
        <a
          href="https://docs.kan.bn/self-hosting/introduction#separate-containers"
          target="_blank"
          rel="noreferrer"
          className="font-semibold underline"
        >
          {t`Self-hosting help`}
        </a>
      )}
    </div>
  );
}
