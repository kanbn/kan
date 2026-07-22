import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { code, error } = req.query;

  if (error) {
    console.error("Google Calendar OAuth error:", error);
    return res.redirect("/settings/integrations?google_calendar=error");
  }

  if (!code || typeof code !== "string") {
    return res.redirect("/settings/integrations?google_calendar=error");
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  return res.redirect(
    `${baseUrl}/settings/integrations?google_calendar=callback&code=${encodeURIComponent(code)}`,
  );
}
