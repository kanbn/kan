import { and, count, desc, eq, isNotNull } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

import type { dbClient } from "@kan/db/client";
import { account, apikey, users } from "@kan/db/schema";

export const getCount = async (db: dbClient) => {
  const result = await db.select({ count: count() }).from(users);

  return result[0]?.count ?? 0;
};

export const getById = async (db: dbClient, userId: string) => {
  const [user, credentialAccount, magicLinkAccount] = await Promise.all([
    db.query.users.findFirst({
      columns: {
        id: true,
        name: true,
        email: true,
        image: true,
        stripeCustomerId: true,
      },
      with: {
        apiKeys: {
          columns: {
            id: true,
            prefix: true,
            key: true,
          },
          orderBy: desc(apikey.createdAt),
          limit: 1,
        },
      },
      where: eq(users.id, userId),
    }),
    db
      .select({ id: account.id })
      .from(account)
      .where(
        and(
          eq(account.userId, userId),
          eq(account.providerId, "credential"),
          isNotNull(account.password),
        ),
      )
      .limit(1),
    db
      .select({ id: account.id })
      .from(account)
      .where(
        and(
          eq(account.userId, userId),
          eq(account.providerId, "magic-link"),
        ),
      )
      .limit(1),
  ]);

  if (!user) return undefined;

  return {
    ...user,
    hasPassword: credentialAccount.length > 0,
    hasMagicLinkAccount: magicLinkAccount.length > 0,
  };
};

export const getByStripeCustomerId = async (
  db: dbClient,
  stripeCustomerId: string,
) => {
  return await db.query.users.findFirst({
    where: eq(users.stripeCustomerId, stripeCustomerId),
  });
};

export const getByEmail = (db: dbClient, email: string) => {
  return db.query.users.findFirst({
    columns: {
      id: true,
      name: true,
      email: true,
    },
    where: eq(users.email, email),
  });
};

export const create = async (
  db: dbClient,
  user: { id?: string; email: string; stripeCustomerId?: string },
) => {
  const [result] = await db
    .insert(users)
    .values({
      id: user.id ?? uuidv4(),
      email: user.email,
      stripeCustomerId: user.stripeCustomerId,
      emailVerified: false,
    })
    .returning();

  return result;
};

export const update = async (
  db: dbClient,
  userId: string,
  updates: { image?: string; name?: string; stripeCustomerId?: string },
) => {
  const [result] = await db
    .update(users)
    .set({
      name: updates.name,
      image: updates.image,
      stripeCustomerId: updates.stripeCustomerId,
    })
    .where(eq(users.id, userId))
    .returning({
      name: users.name,
      image: users.image,
      stripeCustomerId: users.stripeCustomerId,
    });

  return result;
};
