import type { NextApiRequest, NextApiResponse } from "next";
import { env } from "next-runtime-env";

import { createNextApiContext } from "@kan/api/trpc";
import { createStripeClient } from "@kan/stripe";
import { withRateLimit } from "@kan/api/utils/rateLimit";

export default withRateLimit(
  { points: 100, duration: 60 },
  async (req: NextApiRequest, res: NextApiResponse) => {
  const stripe = createStripeClient();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { user } = await createNextApiContext(req);

    if (!user?.stripeCustomerId) {
      return res.status(404).json({ error: "No billing account found" });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${env("NEXT_PUBLIC_BASE_URL")}/settings`,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Error creating portal session" });
  }
  },
);
