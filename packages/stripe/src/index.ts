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

export { createStripeClient };
