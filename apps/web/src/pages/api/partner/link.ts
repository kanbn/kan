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
      return res.redirect("/boards?partner_error=missing_license");
    }

    const { db, user } = await createNextApiContext(req);

    if (!user) {
      return res.redirect(
        `/login?next=${encodeURIComponent(`/api/partner/link?license_key=${license_key}`)}`,
      );
    }

    const allSlots = await subscriptionRepo.getAllByPartnerLicenseKey(
      db,
      license_key,
    );

    if (!allSlots.length) {
      return res.redirect("/boards?partner_error=invalid_license");
    }

    const activeSlots = allSlots.filter((s) =>
      ["active", "trialing"].includes(s.status),
    );

    if (!activeSlots.length) {
      return res.redirect("/boards?partner_error=license_inactive");
    }

    const unlinkedSlot = activeSlots.find((s) => !s.referenceId);

    if (!unlinkedSlot) {
      return res.redirect("/boards?partner_activated=1");
    }

    const linkedIds = new Set(
      activeSlots.filter((s) => s.referenceId).map((s) => s.referenceId!),
    );

    const memberships = await workspaceRepo.getAllByUserId(db, user.id);
    const availableWorkspace = memberships
      .map((m) => m.workspace)
      .find((w) => w && !w.deletedAt && !linkedIds.has(w.publicId));

    if (!availableWorkspace) {
      return res.redirect(
        `/onboarding/workspace?license_key=${encodeURIComponent(license_key)}`,
      );
    }

    await subscriptionRepo.updateById(db, unlinkedSlot.id, {
      referenceId: availableWorkspace.publicId,
    });

    await workspaceRepo.update(db, availableWorkspace.publicId, {
      plan: unlinkedSlot.plan as "free" | "team" | "pro" | "enterprise",
    });

    const remainingUnlinked = activeSlots.filter(
      (s) => !s.referenceId && s.id !== unlinkedSlot.id,
    );

    if (remainingUnlinked.length > 0) {
      const updatedLinkedIds = new Set([
        ...linkedIds,
        availableWorkspace.publicId,
      ]);
      const hasMoreAvailableWorkspace = memberships
        .map((m) => m.workspace)
        .some((w) => w && !w.deletedAt && !updatedLinkedIds.has(w.publicId));

      if (hasMoreAvailableWorkspace) {
        return res.redirect(
          `/api/partner/link?license_key=${encodeURIComponent(license_key)}`,
        );
      }
    }

    return res.redirect("/boards?partner_activated=1");
  }),
);
