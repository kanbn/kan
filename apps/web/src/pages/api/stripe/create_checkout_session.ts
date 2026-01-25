import type { NextApiRequest, NextApiResponse } from "next";
import { env } from "next-runtime-env";
import { z } from "zod";

import { createNextApiContext } from "@kan/api/trpc";
import * as subscriptionRepo from "@kan/db/repository/subscription.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { createStripeClient } from "@kan/stripe";
import { withRateLimit } from "@kan/api/utils/rateLimit";

const workspaceSlugSchema = z
  .string()
  .min(3)
  .max(24)
  .regex(/^(?![-]+$)[a-zA-Z0-9-]+$/);

interface CheckoutSessionRequest {
  successUrl: string;
  cancelUrl: string;
  slug: string;
  workspacePublicId: string;
  stripeCustomerId: string;
}

export default withRateLimit(
  { points: 100, duration: 60 },
  async (req: NextApiRequest, res: NextApiResponse) => {
  const stripe = createStripeClient();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { user, db } = await createNextApiContext(req);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const body = req.body as CheckoutSessionRequest;
    const { successUrl, cancelUrl, slug, workspacePublicId } = body;

    if (!successUrl || !cancelUrl || !workspacePublicId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (slug) {
      const slugResult = workspaceSlugSchema.safeParse(slug);

      if (!slugResult.success) {
        return new Response(
          JSON.stringify({ error: "Invalid workspace slug" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    }

    const workspace = await workspaceRepo.getAllByUserId(db, user.id);

    const isMemberOfWorkspace = workspace.some(
      ({ workspace }) => workspace.publicId === body.workspacePublicId,
    );

    if (!isMemberOfWorkspace) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const subscription = await subscriptionRepo.create(db, {
      plan: "pro",
      referenceId: workspacePublicId,
      userId: user.id,
      stripeCustomerId: user.stripeCustomerId ?? "",
      status: "incomplete",
    });

    const subscriptionId = subscription?.id;

    if (!subscriptionId) {
      return res.status(500).json({ error: "Error creating subscription" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_collection: "always",
      line_items: [
        {
          price: process.env.STRIPE_PRO_PLAN_MONTHLY_PRICE_ID,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 14,
      },
      success_url: `${env("NEXT_PUBLIC_BASE_URL")}${successUrl}`,
      cancel_url: `${env("NEXT_PUBLIC_BASE_URL")}${cancelUrl}`,
      client_reference_id: workspacePublicId,
      customer: user.stripeCustomerId ?? undefined,
      metadata: {
        ...(slug && { workspaceSlug: slug }),
        workspacePublicId,
        userId: user.id,
        subscriptionId,
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Error creating checkout session" });
  }
  },
);
