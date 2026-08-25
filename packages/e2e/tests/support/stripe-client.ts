import Stripe from "stripe";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

let client: Stripe | undefined;

export function getStripeClient() {
  client ??= new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
    apiVersion: "2025-08-27.basil",
  });
  return client;
}

export async function cancelActiveSubscriptionForUserEmail(email: string) {
  const stripe = getStripeClient();

  const customers = await stripe.customers.list({ email, limit: 1 });
  const customer = customers.data[0];
  if (!customer) {
    throw new Error(`No Stripe customer found for ${email}`);
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: customer.id,
    limit: 1,
  });
  const subscription = subscriptions.data[0];
  if (!subscription) {
    throw new Error(`No subscription found for customer ${customer.id}`);
  }

  await stripe.subscriptions.cancel(subscription.id);
}
