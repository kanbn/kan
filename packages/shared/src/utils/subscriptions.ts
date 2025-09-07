export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid";
export type SubscriptionPlan = "team" | "pro";

export interface Subscription {
  id: number | null;
  plan: string;
  status: string;
  seats: number | null;
  unlimitedSeats: boolean;
  periodStart: Date | null;
  periodEnd: Date | null;
  referenceId: string;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const getActiveSubscriptions = (
  subscriptions: Subscription[] | undefined,
) => {
  if (!subscriptions) return [];
  return subscriptions.filter(
    (sub) => sub.status === "active" || sub.status === "trialing",
  );
};

export const getSubscriptionByPlan = (
  subscriptions: Subscription[] | undefined,
  plan: SubscriptionPlan,
) => {
  if (!subscriptions) return undefined;
  return subscriptions.find(
    (sub) =>
      sub.plan === plan &&
      (sub.status === "active" || sub.status === "trialing"),
  );
};

export const hasActiveSubscription = (
  subscriptions: Subscription[] | undefined,
  plan: SubscriptionPlan,
) => {
  return getSubscriptionByPlan(subscriptions, plan) !== undefined;
};

export const hasUnlimitedSeats = (
  subscriptions: Subscription[] | undefined,
) => {
  const activeSubscriptions = getActiveSubscriptions(subscriptions);
  return activeSubscriptions.some((sub) => sub.unlimitedSeats);
};
