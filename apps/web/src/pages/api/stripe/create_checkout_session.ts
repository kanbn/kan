import type { NextApiRequest, NextApiResponse } from "next";
import { env } from "next-runtime-env";
import { z } from "zod";

import { createNextApiContext } from "@kan/api/trpc";
import { withApiLogging } from "@kan/api/utils/apiLogging";
import { assertPermission } from "@kan/api/utils/permissions";
import { withRateLimit } from "@kan/api/utils/rateLimit";
import * as subscriptionRepo from "@kan/db/repository/subscription.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { generateUID } from "@kan/shared/utils";
import { createStripeClient } from "@kan/stripe";

const workspaceSlugSchema = z
  .string()
  .min(3)
  .max(64)
  .regex(/^(?![-]+$)[a-zA-Z0-9-]+$/);

interface CheckoutSessionRequest {
  successUrl: string;
  cancelUrl: string;
  plan: "team" | "pro";
  billing?: string;
  workspacePublicId?: string;
  slug?: string;
  workspaceName?: string;
  workspaceDescription?: string;
  workspaceSlug?: string;
}

export default withRateLimit(
  { points: 100, duration: 60 },
  withApiLogging(async (req: NextApiRequest, res: NextApiResponse) => {
    const stripe = createStripeClient();

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { user, db } = await createNextApiContext(req);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const body = req.body as CheckoutSessionRequest;
    const {
      successUrl,
      cancelUrl,
      plan,
      billing,
      workspacePublicId,
      slug,
      workspaceName,
      workspaceDescription,
      workspaceSlug,
    } = body;

    if (!successUrl || !cancelUrl || !plan) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!workspacePublicId && !workspaceName) {
      return res
        .status(400)
        .json({ error: "Must provide workspacePublicId or workspaceName" });
    }

    const resolvedSlug = slug ?? workspaceSlug;

    if (resolvedSlug) {
      const slugResult = workspaceSlugSchema.safeParse(resolvedSlug);
      if (!slugResult.success) {
        return res.status(400).json({ error: "Invalid workspace slug" });
      }
    }

    let resolvedWorkspacePublicId = workspacePublicId;
    let subscriptionId: number | undefined;

    if (workspacePublicId) {
      // Existing workspace upgrade
      const workspace = await workspaceRepo.getByPublicId(
        db,
        workspacePublicId,
      );

      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found" });
      }

      try {
        await assertPermission(db, user.id, workspace.id, "workspace:manage");
      } catch {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const subscription = await subscriptionRepo.create(db, {
        plan: plan,
        referenceId: workspacePublicId,
        userId: user.id,
        stripeCustomerId: user.stripeCustomerId ?? "",
        status: "incomplete",
      });

      subscriptionId = subscription?.id;

      if (!subscriptionId) {
        return res.status(500).json({ error: "Error creating subscription" });
      }
    } else {
      resolvedWorkspacePublicId = generateUID();
    }

    const isTeam = body.plan === "team";
    const annualPriceId = isTeam
      ? (process.env.STRIPE_TEAM_PLAN_YEARLY_PRICE_ID ??
        process.env.STRIPE_TEAM_PLAN_MONTHLY_PRICE_ID)
      : (process.env.STRIPE_PRO_PLAN_YEARLY_PRICE_ID ??
        process.env.STRIPE_PRO_PLAN_MONTHLY_PRICE_ID);
    const monthlyPriceId = isTeam
      ? process.env.STRIPE_TEAM_PLAN_MONTHLY_PRICE_ID
      : process.env.STRIPE_PRO_PLAN_MONTHLY_PRICE_ID;
    const priceId = billing === "annual" ? annualPriceId : monthlyPriceId;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_collection: "always",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { trial_period_days: 14 },
      success_url: `${env("NEXT_PUBLIC_BASE_URL")}${successUrl}?workspacePublicId=${resolvedWorkspacePublicId}`,
      cancel_url: `${env("NEXT_PUBLIC_BASE_URL")}${cancelUrl}`,
      client_reference_id: resolvedWorkspacePublicId,
      customer: user.stripeCustomerId ?? undefined,
      metadata: {
        workspacePublicId: resolvedWorkspacePublicId!,
        userId: user.id,
        userEmail: user.email ?? "",
        ...(resolvedSlug && { workspaceSlug: resolvedSlug }),
        ...(workspaceName && { workspaceName }),
        ...(workspaceDescription && { workspaceDescription }),
        ...(subscriptionId && { subscriptionId: String(subscriptionId) }),
        plan: plan,
        isNewWorkspace: workspaceName ? "true" : "false",
      },
    });

    return res.status(200).json({ url: session.url });
  }),
);
