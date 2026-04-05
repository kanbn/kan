import type { NextApiRequest, NextApiResponse } from "next";
import type { Readable } from "node:stream";

import { createNextApiContext } from "@kan/api/trpc";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { createLogger } from "@kan/logger";
import { createStripeClient } from "@kan/stripe";

const log = createLogger("stripe-webhook");

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

    log.info(
      { eventType: event.type, eventId: event.id },
      "Stripe webhook received",
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const checkoutSession = event.data.object;
        const meta = checkoutSession.metadata;

        if (!meta?.workspacePublicId) break;

        if (
          meta.isNewWorkspace === "true" &&
          meta.workspaceName &&
          meta.userId &&
          meta.userEmail
        ) {
          const slug = meta.workspaceSlug ?? meta.workspacePublicId;

          await workspaceRepo.create(db, {
            publicId: meta.workspacePublicId,
            name: meta.workspaceName,
            slug,
            createdBy: meta.userId,
            createdByEmail: meta.userEmail,
            ...(meta.workspaceDescription && {
              description: meta.workspaceDescription,
            }),
          });
        }

        const plan = meta.plan === "team" ? "team" : "pro";
        await workspaceRepo.update(db, meta.workspacePublicId, {
          plan,
          ...(plan === "pro" &&
            meta.workspaceSlug &&
            meta.isNewWorkspace !== "true" && { slug: meta.workspaceSlug }),
        });

        break;
      }
      default:
        log.warn({ eventType: event.type }, "Unhandled Stripe event type");
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    log.error({ err }, "Stripe webhook handler failed");
    return res.status(400).json({ message: "Webhook handler failed" });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
