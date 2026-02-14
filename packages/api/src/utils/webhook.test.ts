import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@kan/db/repository/webhook.repo", () => ({
  getActiveByWorkspaceId: vi.fn(),
}));

import * as webhookRepo from "@kan/db/repository/webhook.repo";
import {
  sendWebhookToUrl,
  sendWebhooksForWorkspace,
  createCardWebhookPayload,
  type WebhookPayload,
} from "./webhook";

const mockGetActiveByWorkspaceId = webhookRepo.getActiveByWorkspaceId as ReturnType<typeof vi.fn>;

describe("webhook utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("createCardWebhookPayload", () => {
    it("creates a payload with required card fields", () => {
      const payload = createCardWebhookPayload(
        "card.created",
        {
          id: "card-123",
          title: "Test Card",
          listId: "list-456",
        },
        {
          boardId: "board-789",
        },
      );

      expect(payload.event).toBe("card.created");
      expect(payload.timestamp).toBe("2024-01-15T12:00:00.000Z");
      expect(payload.data.card).toEqual({
        id: "card-123",
        title: "Test Card",
        description: undefined,
        dueDate: null,
        listId: "list-456",
        boardId: "board-789",
      });
    });

    it("includes optional card fields when provided", () => {
      const dueDate = new Date("2024-02-01T10:00:00.000Z");
      const payload = createCardWebhookPayload(
        "card.updated",
        {
          id: "card-123",
          title: "Test Card",
          description: "A description",
          dueDate,
          listId: "list-456",
        },
        {
          boardId: "board-789",
        },
      );

      expect(payload.data.card.description).toBe("A description");
      expect(payload.data.card.dueDate).toBe("2024-02-01T10:00:00.000Z");
    });

    it("includes board context when provided", () => {
      const payload = createCardWebhookPayload(
        "card.created",
        {
          id: "card-123",
          title: "Test Card",
          listId: "list-456",
        },
        {
          boardId: "board-789",
          boardName: "My Board",
        },
      );

      expect(payload.data.board).toEqual({
        id: "board-789",
        name: "My Board",
      });
    });

    it("includes list context when provided", () => {
      const payload = createCardWebhookPayload(
        "card.created",
        {
          id: "card-123",
          title: "Test Card",
          listId: "list-456",
        },
        {
          boardId: "board-789",
          listName: "To Do",
        },
      );

      expect(payload.data.list).toEqual({
        id: "list-456",
        name: "To Do",
      });
    });

    it("includes user context when provided", () => {
      const payload = createCardWebhookPayload(
        "card.created",
        {
          id: "card-123",
          title: "Test Card",
          listId: "list-456",
        },
        {
          boardId: "board-789",
          user: {
            id: "user-111",
            name: "John Doe",
          },
        },
      );

      expect(payload.data.user).toEqual({
        id: "user-111",
        name: "John Doe",
      });
    });

    it("includes changes for card.updated events", () => {
      const payload = createCardWebhookPayload(
        "card.updated",
        {
          id: "card-123",
          title: "Updated Title",
          listId: "list-456",
        },
        {
          boardId: "board-789",
          changes: {
            title: { from: "Old Title", to: "Updated Title" },
          },
        },
      );

      expect(payload.data.changes).toEqual({
        title: { from: "Old Title", to: "Updated Title" },
      });
    });
  });

  describe("sendWebhookToUrl", () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      global.fetch = vi.fn();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    const mockPayload: WebhookPayload = {
      event: "card.created",
      timestamp: "2024-01-15T12:00:00.000Z",
      data: {
        card: {
          id: "card-123",
          title: "Test Card",
          listId: "list-456",
          boardId: "board-789",
        },
      },
    };

    it("sends POST request with correct headers", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      await sendWebhookToUrl("https://example.com/webhook", undefined, mockPayload);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://example.com/webhook",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "X-Webhook-Event": "card.created",
            "X-Webhook-Timestamp": "2024-01-15T12:00:00.000Z",
          }),
          body: JSON.stringify(mockPayload),
        }),
      );
    });

    it("includes signature header when secret is provided", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      await sendWebhookToUrl("https://example.com/webhook", "my-secret", mockPayload);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://example.com/webhook",
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-Webhook-Signature": expect.stringMatching(/^[a-f0-9]{64}$/),
          }),
        }),
      );
    });

    it("returns success for 2xx responses", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const result = await sendWebhookToUrl(
        "https://example.com/webhook",
        undefined,
        mockPayload,
      );

      expect(result).toEqual({ success: true, statusCode: 200 });
    });

    it("returns failure for non-2xx responses", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      const result = await sendWebhookToUrl(
        "https://example.com/webhook",
        undefined,
        mockPayload,
      );

      expect(result).toEqual({
        success: false,
        statusCode: 500,
        error: "500 Internal Server Error",
      });
    });

    it("returns failure on network error", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("Network error"),
      );

      const result = await sendWebhookToUrl(
        "https://example.com/webhook",
        undefined,
        mockPayload,
      );

      expect(result).toEqual({
        success: false,
        error: "Network error",
      });
    });

    it("returns timeout error when request takes too long", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => {
              const error = new Error("Aborted");
              error.name = "AbortError";
              reject(error);
            }, 15000);
          }),
      );

      const resultPromise = sendWebhookToUrl(
        "https://example.com/webhook",
        undefined,
        mockPayload,
      );

      // Advance timers to trigger the abort
      vi.advanceTimersByTime(15000);

      const result = await resultPromise;
      expect(result).toEqual({
        success: false,
        error: "Request timed out",
      });
    });
  });

  describe("sendWebhooksForWorkspace", () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      global.fetch = vi.fn();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    const mockDb = {} as Parameters<typeof sendWebhooksForWorkspace>[0];

    const mockPayload: WebhookPayload = {
      event: "card.created",
      timestamp: "2024-01-15T12:00:00.000Z",
      data: {
        card: {
          id: "card-123",
          title: "Test Card",
          listId: "list-456",
          boardId: "board-789",
        },
      },
    };

    it("sends to all active webhooks subscribed to the event", async () => {
      mockGetActiveByWorkspaceId.mockResolvedValueOnce([
        {
          id: 1,
          publicId: "wh-1",
          url: "https://example.com/webhook1",
          secret: "secret1",
          events: ["card.created", "card.updated"],
          active: true,
        },
        {
          id: 2,
          publicId: "wh-2",
          url: "https://example.com/webhook2",
          secret: null,
          events: ["card.created"],
          active: true,
        },
      ]);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        status: 200,
      });

      await sendWebhooksForWorkspace(mockDb, 1, mockPayload);

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://example.com/webhook1",
        expect.any(Object),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        "https://example.com/webhook2",
        expect.any(Object),
      );
    });

    it("does not send to webhooks not subscribed to the event", async () => {
      mockGetActiveByWorkspaceId.mockResolvedValueOnce([
        {
          id: 1,
          publicId: "wh-1",
          url: "https://example.com/webhook1",
          secret: null,
          events: ["card.deleted"], // Not subscribed to card.created
          active: true,
        },
      ]);

      await sendWebhooksForWorkspace(mockDb, 1, mockPayload);

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("continues sending to other webhooks when one fails", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      mockGetActiveByWorkspaceId.mockResolvedValueOnce([
        {
          id: 1,
          publicId: "wh-1",
          url: "https://example.com/webhook1",
          secret: null,
          events: ["card.created"],
          active: true,
        },
        {
          id: 2,
          publicId: "wh-2",
          url: "https://example.com/webhook2",
          secret: null,
          events: ["card.created"],
          active: true,
        },
      ]);

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ ok: false, status: 500, statusText: "Error" })
        .mockResolvedValueOnce({ ok: true, status: 200 });

      await sendWebhooksForWorkspace(mockDb, 1, mockPayload);

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Webhook delivery failed"),
      );

      consoleSpy.mockRestore();
    });

    it("handles empty webhook list", async () => {
      mockGetActiveByWorkspaceId.mockResolvedValueOnce([]);

      await sendWebhooksForWorkspace(mockDb, 1, mockPayload);

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
