import type { GetServerSideProps } from "next";
import { env } from "next-runtime-env";

const PUBLIC_PATHS = [
  "/",
  "/pricing",
  "/templates",
  "/oss-friends",
  "/terms",
  "/privacy",
  "/login",
  "/signup",
];

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const baseUrl = env("NEXT_PUBLIC_BASE_URL") || `https://${req.headers.host}`;

  const urls = PUBLIC_PATHS.map(
    (path) => `  <url><loc>${baseUrl}${path}</loc></url>`,
  ).join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  res.setHeader("Content-Type", "application/xml");
  res.write(body);
  res.end();

  return { props: {} };
};

export default function Sitemap() {
  return null;
}
