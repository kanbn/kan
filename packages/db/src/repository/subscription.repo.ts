import { and, asc, eq, inArray, isNotNull, isNull } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import { subscription } from "@kan/db/schema";

export const updateById = async (
  db: dbClient,
  subscriptionId: number,
  updates: {
    plan?: string;
    unlimitedSeats?: boolean;
    status?: string;
    seats?: number | null;
    periodStart?: Date | null;
    periodEnd?: Date | null;
    cancelAtPeriodEnd?: boolean | null;
    stripeSubscriptionId?: string | null;
    referenceId?: string | null;
    partnerLicenseKey?: string;
    partnerTier?: number;
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
      referenceId: subscription.referenceId,
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

export const updateAllByPartnerLicenseKey = async (
  db: dbClient,
  partnerLicenseKey: string,
  updates: {
    plan?: string;
    status?: string;
    partnerTier?: number;
    seats?: number | null;
    unlimitedSeats?: boolean;
  },
) => {
  return await db
    .update(subscription)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(subscription.partnerLicenseKey, partnerLicenseKey))
    .returning({ id: subscription.id });
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

export const getByPartnerLicenseKey = async (
  db: dbClient,
  partnerLicenseKey: string,
) => {
  return await db.query.subscription.findFirst({
    where: eq(subscription.partnerLicenseKey, partnerLicenseKey),
  });
};

export const getAllByPartnerLicenseKey = async (
  db: dbClient,
  partnerLicenseKey: string,
) => {
  return await db.query.subscription.findMany({
    where: eq(subscription.partnerLicenseKey, partnerLicenseKey),
    orderBy: [asc(subscription.id)],
  });
};

export const getFirstUnlinkedSlotByLicenseKey = async (
  db: dbClient,
  partnerLicenseKey: string,
) => {
  return await db.query.subscription.findFirst({
    where: and(
      eq(subscription.partnerLicenseKey, partnerLicenseKey),
      isNull(subscription.referenceId),
      inArray(subscription.status, ["active", "trialing"]),
    ),
    orderBy: [asc(subscription.id)],
  });
};

export const getAllActivePartnerSubsByWorkspaceIds = async (
  db: dbClient,
  workspacePublicIds: string[],
) => {
  if (workspacePublicIds.length === 0) return [];
  return await db.query.subscription.findMany({
    where: and(
      inArray(subscription.referenceId, workspacePublicIds),
      isNotNull(subscription.partnerLicenseKey),
      inArray(subscription.status, ["active", "trialing"]),
    ),
  });
};

export const getFirstActivePartnerSubByWorkspaceIds = async (
  db: dbClient,
  workspacePublicIds: string[],
) => {
  return await db.query.subscription.findFirst({
    where: and(
      inArray(subscription.referenceId, workspacePublicIds),
      isNotNull(subscription.partnerLicenseKey),
      inArray(subscription.status, ["active", "trialing"]),
    ),
  });
};

export const createPartnerLicenseSlots = async (
  db: dbClient,
  partnerLicenseKey: string,
  data: {
    plan: string;
    status: string;
    partnerTier: number;
    seats: number | null;
    unlimitedSeats: boolean;
  },
  count: number,
) => {
  const rows = Array.from({ length: count }, () => ({
    partnerLicenseKey,
    ...data,
    referenceId: null,
  }));
  return await db.insert(subscription).values(rows).returning();
};
