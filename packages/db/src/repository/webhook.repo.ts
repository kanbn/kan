import { and, eq } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import { workspaceWebhooks } from "@kan/db/schema";
import { generateUID } from "@kan/shared/utils";

import type { WebhookEvent } from "../schema/webhooks";

export const create = async (
  db: dbClient,
  webhookInput: {
    workspaceId: number;
    name: string;
    url: string;
    secret?: string;
    events: WebhookEvent[];
    createdBy: string;
  },
) => {
  const [webhook] = await db
    .insert(workspaceWebhooks)
    .values({
      publicId: generateUID(),
      workspaceId: webhookInput.workspaceId,
      name: webhookInput.name,
      url: webhookInput.url,
      secret: webhookInput.secret,
      events: JSON.stringify(webhookInput.events),
      createdBy: webhookInput.createdBy,
    })
    .returning({
      publicId: workspaceWebhooks.publicId,
      name: workspaceWebhooks.name,
      url: workspaceWebhooks.url,
      events: workspaceWebhooks.events,
      active: workspaceWebhooks.active,
      createdAt: workspaceWebhooks.createdAt,
    });

  return webhook
    ? {
        ...webhook,
        events: JSON.parse(webhook.events) as WebhookEvent[],
      }
    : null;
};

export const update = async (
  db: dbClient,
  webhookPublicId: string,
  webhookInput: {
    name?: string;
    url?: string;
    secret?: string;
    events?: WebhookEvent[];
    active?: boolean;
  },
) => {
  const [result] = await db
    .update(workspaceWebhooks)
    .set({
      name: webhookInput.name,
      url: webhookInput.url,
      secret: webhookInput.secret,
      events: webhookInput.events
        ? JSON.stringify(webhookInput.events)
        : undefined,
      active: webhookInput.active,
      updatedAt: new Date(),
    })
    .where(eq(workspaceWebhooks.publicId, webhookPublicId))
    .returning({
      publicId: workspaceWebhooks.publicId,
      name: workspaceWebhooks.name,
      url: workspaceWebhooks.url,
      events: workspaceWebhooks.events,
      active: workspaceWebhooks.active,
      createdAt: workspaceWebhooks.createdAt,
      updatedAt: workspaceWebhooks.updatedAt,
    });

  return result
    ? {
        ...result,
        events: JSON.parse(result.events) as WebhookEvent[],
      }
    : null;
};

export const getByPublicId = async (db: dbClient, webhookPublicId: string) => {
  const result = await db.query.workspaceWebhooks.findFirst({
    columns: {
      id: true,
      publicId: true,
      workspaceId: true,
      name: true,
      url: true,
      secret: true,
      events: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
    where: eq(workspaceWebhooks.publicId, webhookPublicId),
  });

  return result
    ? {
        ...result,
        events: JSON.parse(result.events) as WebhookEvent[],
      }
    : null;
};

export const getAllByWorkspaceId = async (
  db: dbClient,
  workspaceId: number,
) => {
  const results = await db.query.workspaceWebhooks.findMany({
    columns: {
      publicId: true,
      name: true,
      url: true,
      events: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
    where: eq(workspaceWebhooks.workspaceId, workspaceId),
  });

  return results.map((webhook) => ({
    ...webhook,
    events: JSON.parse(webhook.events) as WebhookEvent[],
  }));
};

export const getActiveByWorkspaceId = async (
  db: dbClient,
  workspaceId: number,
) => {
  const results = await db.query.workspaceWebhooks.findMany({
    columns: {
      publicId: true,
      url: true,
      secret: true,
      events: true,
    },
    where: and(
      eq(workspaceWebhooks.workspaceId, workspaceId),
      eq(workspaceWebhooks.active, true),
    ),
  });

  return results.map((webhook) => ({
    ...webhook,
    events: JSON.parse(webhook.events) as WebhookEvent[],
  }));
};

export const hardDelete = (db: dbClient, webhookPublicId: string) => {
  return db
    .delete(workspaceWebhooks)
    .where(eq(workspaceWebhooks.publicId, webhookPublicId));
};
