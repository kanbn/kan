import type { NextApiRequest, NextApiResponse } from "next";

import { createNextApiContext } from "@kan/api/trpc";
import { withApiLogging } from "@kan/api/utils/apiLogging";
import { withRateLimit } from "@kan/api/utils/rateLimit";
import * as subscriptionRepo from "@kan/db/repository/subscription.repo";
import { createLogger } from "@kan/logger";

import { tierConfig } from "./_utils";

const log = createLogger("api");

interface TokenResponse {
  access_token: string;
  token_type: string;
}

interface OAuthLicenseResponse {
  license_key: string;
  status: string;
}

interface LicenseDetailResponse {
  license_key: string;
  status: string;
  tier: number;
}

async function exchangeCodeForToken(code: string): Promise<TokenResponse> {
  const tokenUrl = process.env.PARTNER_TOKEN_URL;
  const clientId = process.env.PARTNER_CLIENT_ID;
  const clientSecret = process.env.PARTNER_CLIENT_SECRET;
  const redirectUrl = process.env.PARTNER_REDIRECT_URL;
  if (!tokenUrl) throw new Error("PARTNER_TOKEN_URL not configured");
  if (!clientId) throw new Error("PARTNER_CLIENT_ID not configured");
  if (!clientSecret) throw new Error("PARTNER_CLIENT_SECRET not configured");
  if (!redirectUrl) throw new Error("PARTNER_REDIRECT_URL not configured");

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUrl,
    }),
  });

  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  return res.json() as Promise<TokenResponse>;
}

async function fetchOAuthLicense(
  accessToken: string,
): Promise<OAuthLicenseResponse> {
  const oauthLicenseUrl = process.env.PARTNER_OAUTH_LICENSE_URL;
  if (!oauthLicenseUrl)
    throw new Error("PARTNER_OAUTH_LICENSE_URL not configured");

  const res = await fetch(`${oauthLicenseUrl}?access_token=${accessToken}`);
  if (!res.ok) throw new Error(`OAuth license fetch failed: ${res.status}`);
  return res.json() as Promise<OAuthLicenseResponse>;
}

async function fetchLicenseDetail(
  licenseKey: string,
): Promise<LicenseDetailResponse> {
  const licenseApiUrl = process.env.PARTNER_LICENSE_API_URL;
  const apiKey = process.env.PARTNER_API_KEY;
  if (!licenseApiUrl) throw new Error("PARTNER_LICENSE_API_URL not configured");
  if (!apiKey) throw new Error("PARTNER_API_KEY not configured");

  const apiKeyHeader = process.env.PARTNER_API_KEY_HEADER;
  if (!apiKeyHeader) throw new Error("PARTNER_API_KEY_HEADER not configured");

  const res = await fetch(`${licenseApiUrl}/${licenseKey}`, {
    headers: { [apiKeyHeader]: apiKey },
  });
  if (!res.ok) throw new Error(`License detail fetch failed: ${res.status}`);
  return res.json() as Promise<LicenseDetailResponse>;
}

export default withRateLimit(
  { points: 20, duration: 60 },
  withApiLogging(async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "GET") {
      return res.status(405).json({ message: "Method not allowed" });
    }

    const { code } = req.query;

    if (!code || typeof code !== "string") {
      return res.status(200).json({ message: "OK" });
    }

    let license: LicenseDetailResponse;

    try {
      const tokenData = await exchangeCodeForToken(code);
      const oauthLicense = await fetchOAuthLicense(tokenData.access_token);
      license = await fetchLicenseDetail(oauthLicense.license_key);
    } catch (err) {
      log.error({ err }, "Partner OAuth flow failed");
      return res.redirect(`/partner/activate?error=oauth_failed`);
    }

    const { db, user } = await createNextApiContext(req);

    const cfg = tierConfig(license.tier);
    const status = license.status === "active" ? "active" : "inactive";

    // Ensure subscription slots exist — webhook may have already created them
    const existing = await subscriptionRepo.getAllByPartnerLicenseKey(
      db,
      license.license_key,
    );
    if (existing.length === 0) {
      await subscriptionRepo.createPartnerLicenseSlots(
        db,
        license.license_key,
        {
          plan: cfg.plan,
          status,
          partnerTier: license.tier,
          seats: cfg.seats,
          unlimitedSeats: cfg.unlimitedSeats,
        },
        cfg.workspaceSlots,
      );
    }

    if (!user) {
      return res.redirect(
        `/partner/activate?license_key=${encodeURIComponent(license.license_key)}`,
      );
    }

    return res.redirect(
      `/api/partner/link?license_key=${encodeURIComponent(license.license_key)}`,
    );
  }),
);
