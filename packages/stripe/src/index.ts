import { Stripe } from "stripe";

export const name = "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

const createStripeClient = () => {
  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2025-08-27.basil",
  });

  return stripe;
};

export const updateSubscriptionSeats = async (
  stripeSubscriptionId: string,
  seatIncrement = 1,
): Promise<Stripe.Subscription> => {
  const stripe = createStripeClient();

  // First, retrieve the current subscription to get the subscription items
  const subscription = await stripe.subscriptions.retrieve(
    stripeSubscriptionId,
    {
      expand: ["items"],
    },
  );

  if (!subscription.items.data.length) {
    throw new Error(
      `No subscription items found for subscription ${stripeSubscriptionId}`,
    );
  }

  // Get the first subscription item
  const subscriptionItem = subscription.items.data[0];
  if (!subscriptionItem) {
    throw new Error(
      `No subscription item found for subscription ${stripeSubscriptionId}`,
    );
  }

  const currentQuantity = subscriptionItem.quantity ?? 1;
  const newQuantity = currentQuantity + seatIncrement;

  // Ensure we don't go below 1 seat
  if (newQuantity < 1) {
    throw new Error(
      `Cannot reduce seats below 1. Current: ${currentQuantity}, Requested change: ${seatIncrement}`,
    );
  }

  // Update the subscription with the new quantity and immediate invoicing
  const updatedSubscription = await stripe.subscriptions.update(
    stripeSubscriptionId,
    {
      items: [
        {
          id: subscriptionItem.id,
          quantity: newQuantity,
        },
      ],
      proration_behavior: "always_invoice", // Accumulate charges for next billing cycle
    },
  );

  return updatedSubscription;
};

export { createStripeClient };
