import { t } from "@lingui/core/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

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
      {t`Kan can't reach its API service. If you self-host Kan, add the api service from the latest docker-compose.yml.`}{" "}
      <a
        href="https://github.com/kanbn/kan#upgrading"
        target="_blank"
        rel="noreferrer"
        className="font-semibold underline"
      >
        {t`See the upgrade guide`}
      </a>
    </div>
  );
}
