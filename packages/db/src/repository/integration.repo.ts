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

export const createOrUpdateProvider = async (
  db: dbClient,
  data: {
    userId: string;
    provider: string;
    accessToken: string;
    refreshToken?: string | null;
    expiresAt: Date;
  },
) => {
  await db
    .insert(integrations)
    .values({
      provider: data.provider,
      userId: data.userId,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken ?? null,
      expiresAt: data.expiresAt,
    })
    .onConflictDoUpdate({
      target: [integrations.userId, integrations.provider],
      set: {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken ?? null,
        expiresAt: data.expiresAt,
      },
    });
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
