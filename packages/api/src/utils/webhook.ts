import crypto from "crypto";

import type { dbClient } from "@kan/db/client";
import * as webhookRepo from "@kan/db/repository/webhook.repo";

export type WebhookEventType =
  | "card.created"
  | "card.updated"
  | "card.deleted"
  | "card.moved";

export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  data: {
    card: {
      id: string;
      title: string;
      description?: string | null;
      dueDate?: string | null; // ISO string after JSON serialization
      listId: string;
      boardId: string;
    };
    board?: {
      id: string;
      name: string;
    };
    list?: {
      id: string;
      name: string;
    };
    user?: {
      id: string;
      name: string | null;
    };
    changes?: Record<string, { from: unknown; to: unknown }>;
  };
}

function generateSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Send a webhook payload to a specific URL
 * Returns result for testing purposes
 */
export async function sendWebhookToUrl(
  url: string,
  secret: string | undefined,
  payload: WebhookPayload,
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Webhook-Event": payload.event,
    "X-Webhook-Timestamp": payload.timestamp,
  };

  if (secret) {
    headers["X-Webhook-Signature"] = generateSignature(body, secret);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        statusCode: response.status,
        error: `${response.status} ${response.statusText}`,
      };
    }

    return { success: true, statusCode: response.status };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      return { success: false, error: "Request timed out" };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send webhook to all active webhooks for a workspace that are subscribed to the event
 */
export async function sendWebhooksForWorkspace(
  db: dbClient,
  workspaceId: number,
  payload: WebhookPayload,
): Promise<void> {
  // Get all active webhooks for this workspace
  const webhooks = await webhookRepo.getActiveByWorkspaceId(db, workspaceId);

  // Filter to webhooks that are subscribed to this event
  const subscribedWebhooks = webhooks.filter((webhook) =>
    webhook.events.includes(payload.event as (typeof webhook.events)[number]),
  );

  // Also check for legacy env var webhook (backwards compatibility)
  const envWebhookUrl = process.env.WEBHOOK_URL;
  const envWebhookSecret = process.env.WEBHOOK_SECRET;

  // Send to all webhooks in parallel (fire and forget)
  const promises: Promise<void>[] = [];

  for (const webhook of subscribedWebhooks) {
    promises.push(
      sendWebhookToUrl(webhook.url, webhook.secret ?? undefined, payload).then(
        (result) => {
          if (!result.success) {
            console.error(
              `Webhook delivery failed to ${webhook.url}: ${result.error}`,
            );
          }
        },
      ),
    );
  }

  // Send to legacy env var webhook if configured
  if (envWebhookUrl) {
    promises.push(
      sendWebhookToUrl(envWebhookUrl, envWebhookSecret, payload).then(
        (result) => {
          if (!result.success) {
            console.error(
              `Legacy webhook delivery failed: ${result.error}`,
            );
          }
        },
      ),
    );
  }

  // Wait for all to complete but don't block on failures
  await Promise.allSettled(promises);
}

/**
 * @deprecated Use sendWebhooksForWorkspace instead for database-configured webhooks
 * Kept for backwards compatibility with env var configuration
 */
export async function sendWebhook(payload: WebhookPayload): Promise<void> {
  const webhookUrl = process.env.WEBHOOK_URL;
  const webhookSecret = process.env.WEBHOOK_SECRET;

  if (!webhookUrl) {
    return;
  }

  const result = await sendWebhookToUrl(webhookUrl, webhookSecret, payload);

  if (!result.success) {
    console.error(`Webhook delivery failed: ${result.error}`);
  }
}

export function createCardWebhookPayload(
  event: WebhookEventType,
  card: {
    id: string;
    title: string;
    description?: string | null;
    dueDate?: Date | null;
    listId: string;
  },
  context: {
    boardId: string;
    boardName?: string;
    listName?: string;
    user?: {
      id: string;
      name: string | null;
    };
    changes?: Record<string, { from: unknown; to: unknown }>;
  },
): WebhookPayload {
  return {
    event,
    timestamp: new Date().toISOString(),
    data: {
      card: {
        id: card.id,
        title: card.title,
        description: card.description,
        dueDate: card.dueDate?.toISOString() ?? null,
        listId: card.listId,
        boardId: context.boardId,
      },
      board: context.boardName
        ? { id: context.boardId, name: context.boardName }
        : undefined,
      list: context.listName
        ? { id: card.listId, name: context.listName }
        : undefined,
      user: context.user,
      changes: context.changes,
    },
  };
}
