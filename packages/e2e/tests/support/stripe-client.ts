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

export async function getCustomerIdForUserEmail(email: string) {
  const stripe = getStripeClient();

  const customers = await stripe.customers.list({ email, limit: 1 });
  const customer = customers.data[0];
  if (!customer) {
    throw new Error(`No Stripe customer found for ${email}`);
  }

  return customer.id;
}

async function waitForTestClockReady(clockId: string, timeoutMs = 40_000) {
  const stripe = getStripeClient();
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const clock = await stripe.testHelpers.testClocks.retrieve(clockId);
    if (clock.status === "ready") return;
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error(`Test clock ${clockId} did not become ready in time`);
}

export async function advanceTrialToEnd(customerId: string) {
  const stripe = getStripeClient();
  const now = Math.floor(Date.now() / 1000);

  type TestClockCreateParamsWithCustomer =
    Stripe.TestHelpers.TestClockCreateParams & { customer: string };

  const createParams: TestClockCreateParamsWithCustomer = {
    frozen_time: now,
    customer: customerId,
  };
  const clock = await stripe.testHelpers.testClocks.create(
    createParams as Stripe.TestHelpers.TestClockCreateParams,
  );
  await waitForTestClockReady(clock.id);

  await stripe.testHelpers.testClocks.advance(clock.id, {
    frozen_time: now + 15 * 24 * 60 * 60,
  });
  await waitForTestClockReady(clock.id);

  return clock.id;
}

export async function deleteTestClock(clockId: string) {
  const stripe = getStripeClient();
  await stripe.testHelpers.testClocks.del(clockId);
}

async function getSubscriptionForCustomer(customerId: string) {
  const stripe = getStripeClient();

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 1,
  });
  const subscription = subscriptions.data[0];
  if (!subscription) {
    throw new Error(`No subscription found for customer ${customerId}`);
  }

  return subscription;
}

export async function getSubscriptionStatusForCustomer(customerId: string) {
  const subscription = await getSubscriptionForCustomer(customerId);
  return subscription.status;
}

export async function getSubscriptionSeatsForCustomer(customerId: string) {
  const subscription = await getSubscriptionForCustomer(customerId);
  return subscription.items.data[0]?.quantity;
}

export async function getSubscriptionPriceIdForCustomer(customerId: string) {
  const subscription = await getSubscriptionForCustomer(customerId);
  return subscription.items.data[0]?.price.id;
}
