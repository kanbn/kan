import type { GetServerSideProps } from "next";

import { getCheckWorkspaceSlugExistsUrl } from "@kan/api-client/hooks";
import { env } from "@kan/shared/env";

import { env as serverEnv } from "~/env";

// Unknown workspace URLs must return a real 404 so search engines drop them.
export const notFoundForUnknownWorkspace: GetServerSideProps = async ({
  params,
}) => {
  const slug = params?.workspaceSlug;
  const apiBaseUrl = serverEnv.KAN_API_URL || env("NEXT_PUBLIC_API_BASE_URL");
  if (typeof slug !== "string" || !apiBaseUrl) return { props: {} };

  try {
    const res = await fetch(
      `${apiBaseUrl}${getCheckWorkspaceSlugExistsUrl(encodeURIComponent(slug))}`,
    );
    const body = res.ok
      ? ((await res.json()) as { exists: boolean })
      : undefined;
    return body?.exists === false ? { notFound: true } : { props: {} };
  } catch {
    return { props: {} };
  }
};
