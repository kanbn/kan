import type { GetServerSideProps } from "next";

import { getApiBaseUrl, getClientIpHeader } from "./api-proxy";

export interface SocialProvidersProps {
  socialProviders: string[] | null;
}

// null makes the form fetch them in the browser instead.
export const getSocialProvidersProps: GetServerSideProps<
  SocialProvidersProps
> = async ({ req }) => {
  try {
    const res = await fetch(
      `${getApiBaseUrl().replace(/\/$/, "")}/api/auth/social-providers`,
      { headers: getClientIpHeader(req), signal: AbortSignal.timeout(1000) },
    );
    const socialProviders = res.ok ? ((await res.json()) as string[]) : null;
    return { props: { socialProviders } };
  } catch {
    return { props: { socialProviders: null } };
  }
};
