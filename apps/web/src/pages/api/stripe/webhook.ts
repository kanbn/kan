import { randomUUID } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import type { Readable } from "node:stream";

import { createNextApiContext } from "@kan/api/trpc";
import * as subscriptionRepo from "@kan/db/repository/subscription.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { createLogger } from "@kan/logger";
import { createStripeClient } from "@kan/stripe";

const log = createLogger("api");

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
  const start = Date.now();
  const requestId = randomUUID();
  const procedure = req.url?.split("?")[0] ?? "/api/stripe/webhook";

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
        const meta = checkoutSession.metadata;

        if (!meta?.workspacePublicId) break;

        const plan = meta.plan === "team" ? "team" : ("pro" as const);

        if (
          meta.isNewWorkspace === "true" &&
          meta.workspaceName &&
          meta.userId &&
          meta.userEmail
        ) {
          const existing = await workspaceRepo.getByPublicId(db, meta.workspacePublicId);

          if (!existing) {
            const slug = meta.workspaceSlug ?? meta.workspacePublicId;

            await workspaceRepo.create(db, {
              publicId: meta.workspacePublicId,
              name: meta.workspaceName,
              slug,
              plan,
              createdBy: meta.userId,
              createdByEmail: meta.userEmail,
              ...(meta.workspaceDescription && {
                description: meta.workspaceDescription,
              }),
            });

            await subscriptionRepo.create(db, {
              plan,
              referenceId: meta.workspacePublicId,
              userId: meta.userId,
              stripeCustomerId: checkoutSession.customer as string,
              status: "active",
            });
          }
        } else {
          // Existing workspace upgrade — update plan (and slug for pro)
          await workspaceRepo.update(db, meta.workspacePublicId, {
            plan,
            ...(plan === "pro" && meta.workspaceSlug && { slug: meta.workspaceSlug }),
          });
        }

        break;
      }
      default:
        log.warn({ eventType: event.type }, "Unhandled Stripe event type");
    }

    log.info(
      {
        requestId,
        procedure,
        transport: "rest",
        duration: Date.now() - start,
        status: 200,
        input: { eventType: event.type, eventId: event.id },
      },
      "API OK",
    );

    return res.status(200).json({ received: true });
  } catch (err) {
    log.error(
      {
        requestId,
        procedure,
        transport: "rest",
        duration: Date.now() - start,
        status: 400,
        err,
      },
      "API error",
    );
    return res.status(400).json({ message: "Webhook handler failed" });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
