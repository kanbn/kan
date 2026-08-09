import type { Subscription } from "@better-auth/stripe";
import type Stripe from "stripe";

import type { dbClient } from "@kan/db/client";
import * as userRepo from "@kan/db/repository/user.repo";
import { triggerSubscriberWorkflow } from "@kan/email";
import { createLogger } from "@kan/logger";

const log = createLogger("auth");

export async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function triggerWorkflow(
  db: dbClient,
  workflowId: string,
  subscription: Subscription,
  cancellationDetails?: Stripe.Subscription.CancellationDetails | null,
) {
  try {
    if (!subscription.stripeCustomerId) return;

    const user = await userRepo.getByStripeCustomerId(
      db,
      subscription.stripeCustomerId,
    );

    if (!user) return;

    log.info({ workflowId, userId: user.id }, "Triggering workflow");
    await triggerSubscriberWorkflow(
      workflowId,
      { publicId: user.id },
      { ...subscription, cancellationDetails },
    );
    log.info({ workflowId, userId: user.id }, "Workflow triggered");
  } catch (error) {
    log.error({ err: error, workflowId }, "Error triggering workflow");
  }
}
