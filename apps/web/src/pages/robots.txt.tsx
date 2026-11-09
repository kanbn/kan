import type { GetServerSideProps } from "next";
import { env } from "next-runtime-env";

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const baseUrl = env("NEXT_PUBLIC_BASE_URL") || `https://${req.headers.host}`;

  const body = [
    "User-agent: *",
    "Disallow: /api/",
    "Disallow: /boards",
    "Disallow: /cards",
    "Disallow: /settings",
    "Disallow: /members",
    "Disallow: /invite",
    "Disallow: /onboarding",
    "Disallow: /upgrade",
    "Disallow: /forgot-password",
    "Disallow: /reset-password",
    "",
    `Sitemap: ${baseUrl}/sitemap.xml`,
    "",
  ].join("\n");

  res.setHeader("Content-Type", "text/plain");
  res.write(body);
  res.end();

  return { props: {} };
};

export default function RobotsTxt() {
  return null;
}
