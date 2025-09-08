import { eq } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import { subscription } from "@kan/db/schema";

export const updateById = async (
  db: dbClient,
  subscriptionId: number,
  updates: {
    unlimitedSeats?: boolean;
    status?: string;
    seats?: number | null;
    periodStart?: Date | null;
    periodEnd?: Date | null;
    cancelAtPeriodEnd?: boolean | null;
  },
) => {
  const [result] = await db
    .update(subscription)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(subscription.id, subscriptionId))
    .returning({
      id: subscription.id,
      plan: subscription.plan,
      status: subscription.status,
      unlimitedSeats: subscription.unlimitedSeats,
    });

  return result;
};

export const updateByStripeSubscriptionId = async (
  db: dbClient,
  stripeSubscriptionId: string,
  updates: {
    unlimitedSeats?: boolean;
    status?: string;
    seats?: number | null;
    periodStart?: Date | null;
    periodEnd?: Date | null;
    cancelAtPeriodEnd?: boolean | null;
  },
) => {
  const [result] = await db
    .update(subscription)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(subscription.stripeSubscriptionId, stripeSubscriptionId))
    .returning({
      id: subscription.id,
      plan: subscription.plan,
      status: subscription.status,
      unlimitedSeats: subscription.unlimitedSeats,
    });

  return result;
};

export const getByStripeSubscriptionId = async (
  db: dbClient,
  stripeSubscriptionId: string,
) => {
  return await db.query.subscription.findFirst({
    where: eq(subscription.stripeSubscriptionId, stripeSubscriptionId),
  });
};

export const getByReferenceId = async (db: dbClient, referenceId: string) => {
  return await db.query.subscription.findMany({
    where: eq(subscription.referenceId, referenceId),
  });
};

export const create = async (
  db: dbClient,
  data: {
    plan: string;
    referenceId: string;
    userId: string;
    stripeCustomerId: string;
    status: string;
  },
) => {
  const [result] = await db.insert(subscription).values(data).returning();
  return result;
};
