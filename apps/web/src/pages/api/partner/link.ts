import type { NextApiRequest, NextApiResponse } from "next";

import { createNextApiContext } from "@kan/api/trpc";
import { withApiLogging } from "@kan/api/utils/apiLogging";
import { withRateLimit } from "@kan/api/utils/rateLimit";
import * as subscriptionRepo from "@kan/db/repository/subscription.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";

export default withRateLimit(
  { points: 20, duration: 60 },
  withApiLogging(async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "GET") {
      return res.status(405).json({ message: "Method not allowed" });
    }

    const { license_key } = req.query;

    if (!license_key || typeof license_key !== "string") {
      return res.redirect("/?partner_error=missing_license");
    }

    const { db, user } = await createNextApiContext(req);

    if (!user) {
      return res.redirect(
        `/login?next=${encodeURIComponent(`/api/partner/link?license_key=${license_key}`)}`,
      );
    }

    const sub = await subscriptionRepo.getByPartnerLicenseKey(db, license_key);

    if (!sub) {
      return res.redirect("/?partner_error=invalid_license");
    }

    if (sub.status !== "active") {
      return res.redirect("/?partner_error=license_inactive");
    }

    const memberships = await workspaceRepo.getAllByUserId(db, user.id);
    const workspace = memberships?.[0]?.workspace;

    if (!workspace) {
      return res.redirect(
        `/onboarding?license_key=${encodeURIComponent(license_key)}`,
      );
    }

    await subscriptionRepo.upsertByPartnerLicenseKey(db, license_key, {
      plan: sub.plan,
      status: sub.status,
      partnerTier: sub.partnerTier ?? 1,
      seats: sub.seats ?? null,
      unlimitedSeats: sub.unlimitedSeats,
      referenceId: workspace.publicId,
    });

    await workspaceRepo.update(db, workspace.publicId, {
      plan: sub.plan as "free" | "team" | "pro" | "enterprise",
    });

    return res.redirect("/?partner_activated=1");
  }),
);
