import { and, eq } from "drizzle-orm";

import type { dbClient } from "@banana/db/client";
import { pushSubscription } from "@banana/db/schema";

export const upsertByEndpoint = async (
  db: dbClient,
  input: {
    userId: string;
    endpoint: string;
    subscriptionJson: string;
  },
) => {
  // The endpoint uniquely identifies a (browser, user) subscription.
  // Re-subscribing the same browser should update, not duplicate.
  const [existing] = await db
    .select({ id: pushSubscription.id })
    .from(pushSubscription)
    .where(eq(pushSubscription.endpoint, input.endpoint))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(pushSubscription)
      .set({
        userId: input.userId,
        subscriptionJson: input.subscriptionJson,
        updatedAt: new Date(),
      })
      .where(eq(pushSubscription.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(pushSubscription)
    .values({
      userId: input.userId,
      endpoint: input.endpoint,
      subscriptionJson: input.subscriptionJson,
    })
    .returning();

  return created;
};

export const getByUser = async (db: dbClient, userId: string) => {
  return db
    .select()
    .from(pushSubscription)
    .where(eq(pushSubscription.userId, userId));
};

export const existsByUser = async (db: dbClient, userId: string) => {
  const rows = await db
    .select({ id: pushSubscription.id })
    .from(pushSubscription)
    .where(eq(pushSubscription.userId, userId))
    .limit(1);
  return rows.length > 0;
};

export const existsByUserAndEndpoint = async (
  db: dbClient,
  userId: string,
  endpoint: string,
) => {
  const rows = await db
    .select({ id: pushSubscription.id })
    .from(pushSubscription)
    .where(
      and(
        eq(pushSubscription.userId, userId),
        eq(pushSubscription.endpoint, endpoint),
      ),
    )
    .limit(1);
  return rows.length > 0;
};

export const deleteByEndpoint = async (db: dbClient, endpoint: string) => {
  await db
    .delete(pushSubscription)
    .where(eq(pushSubscription.endpoint, endpoint));
};

export const deleteByUser = async (db: dbClient, userId: string) => {
  await db.delete(pushSubscription).where(eq(pushSubscription.userId, userId));
};
