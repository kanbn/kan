import crypto from "crypto";

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

export async function sendWebhook(payload: WebhookPayload): Promise<void> {
  const webhookUrl = process.env.WEBHOOK_URL;
  const webhookSecret = process.env.WEBHOOK_SECRET;

  if (!webhookUrl) {
    return;
  }

  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Webhook-Event": payload.event,
    "X-Webhook-Timestamp": payload.timestamp,
  };

  if (webhookSecret) {
    headers["X-Webhook-Signature"] = generateSignature(body, webhookSecret);
  }

  // Add timeout to prevent hanging on slow endpoints
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error(
        `Webhook delivery failed: ${response.status} ${response.statusText}`,
      );
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("Webhook delivery timed out");
    } else {
      console.error("Webhook delivery error:", error);
    }
  } finally {
    clearTimeout(timeoutId);
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
