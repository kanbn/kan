import { and, eq, gte } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import { integrations } from "@kan/db/schema";

export const isProviderAvailableForUser = async (
  db: dbClient,
  userId: string,
  provider: string,
) => {
  const integration = await db.query.integrations.findFirst({
    where: and(
      eq(integrations.userId, userId),
      eq(integrations.provider, provider),
      gte(integrations.expiresAt, new Date()),
    ),
  });

  return !!integration;
};

export const getProviderForUser = async (
  db: dbClient,
  userId: string,
  provider: string,
) => {
  const integration = await db.query.integrations.findFirst({
    where: and(
      eq(integrations.userId, userId),
      eq(integrations.provider, provider),
      gte(integrations.expiresAt, new Date()),
    ),
  });

  return integration;
};

export const getProvidersForUser = async (db: dbClient, userId: string) => {
  const integration = await db.query.integrations.findMany({
    where: and(
      eq(integrations.userId, userId),
      gte(integrations.expiresAt, new Date()),
    ),
  });

  return integration;
};

export const deleteProviderForUser = async (
  db: dbClient,
  userId: string,
  provider: string,
) => {
  await db
    .delete(integrations)
    .where(
      and(eq(integrations.userId, userId), eq(integrations.provider, provider)),
    );
};
