import type { Subscription } from "@better-auth/stripe";
import type Stripe from "stripe";

import type { dbClient } from "@kan/db/client";
import * as userRepo from "@kan/db/repository/user.repo";
import { notificationClient } from "@kan/email";
import { createEmailUnsubscribeLink } from "@kan/shared";

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
    if (!subscription.stripeCustomerId || !notificationClient) return;

    const user = await userRepo.getByStripeCustomerId(
      db,
      subscription.stripeCustomerId,
    );

    if (!user || !notificationClient) return;

    const unsubscribeUrl = await createEmailUnsubscribeLink(user.id);

    await notificationClient.trigger({
      to: {
        subscriberId: user.id,
      },
      payload: {
        ...subscription,
        cancellationDetails,
        emailUnsubscribeUrl: unsubscribeUrl,
      },
      workflowId,
    });
  } catch (error) {
    console.error("Error triggering workflow", error);
  }
}
