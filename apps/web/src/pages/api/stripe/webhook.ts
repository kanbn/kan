import type { NextApiRequest, NextApiResponse } from "next";
import type { Readable } from "node:stream";

import { createNextApiContext } from "@kan/api/trpc";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { createStripeClient } from "@kan/stripe";

async function buffer(readable: Readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const stripe = createStripeClient();

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const sig = req.headers["stripe-signature"];

  if (!sig) {
    return res.status(400).json({ message: "No signature found" });
  }

  try {
    const buf = await buffer(req);
    const rawBody = buf.toString("utf8");

    const event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET_LEGACY!,
    );

    const { db } = await createNextApiContext(req);

    switch (event.type) {
      case "checkout.session.completed": {
        const checkoutSession = event.data.object;

        const metaData = checkoutSession.metadata;

        if (metaData?.workspacePublicId) {
          await workspaceRepo.update(db, metaData.workspacePublicId, {
            ...(metaData.workspaceSlug && { slug: metaData.workspaceSlug }),
            plan: "pro",
          });
        }
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(400).json({ message: "Webhook handler failed" });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
