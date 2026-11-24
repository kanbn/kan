import type { GetServerSideProps } from "next";

import { getCheckWorkspaceSlugExistsUrl } from "@kan/api-client/hooks";

import { getApiBaseUrl } from "./api-proxy";

// Unknown workspace URLs must return a real 404 so search engines drop them.
export const notFoundForUnknownWorkspace: GetServerSideProps = async ({
  params,
}) => {
  const slug = params?.workspaceSlug;
  if (typeof slug !== "string") return { props: {} };

  try {
    const res = await fetch(
      `${getApiBaseUrl()}${getCheckWorkspaceSlugExistsUrl(encodeURIComponent(slug))}`,
    );
    const body = res.ok
      ? ((await res.json()) as { exists: boolean })
      : undefined;
    return body?.exists === false ? { notFound: true } : { props: {} };
  } catch {
    return { props: {} };
  }
};
