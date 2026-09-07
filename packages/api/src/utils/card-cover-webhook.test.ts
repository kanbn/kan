import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createCardWebhookPayload } from "./webhook";

const { mockLogger } = vi.hoisted(() => ({
  mockLogger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@kan/db/repository/webhook.repo", () => ({}));
vi.mock("@kan/logger", () => ({
  createLogger: vi.fn(() => mockLogger),
}));

describe("card cover webhook payload", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("includes a normalized cover and its change", () => {
    const cover = {
      kind: "colour" as const,
      colourCode: "#0d9488",
      size: "normal" as const,
    };
    const payload = createCardWebhookPayload(
      "card.updated",
      {
        id: "card-123",
        publicId: "card-pub-123",
        title: "Test Card",
        cover,
        listId: "list-456",
      },
      {
        boardId: "board-789",
        changes: { cover: { from: null, to: cover } },
      },
    );

    expect(payload.data.card.cover).toEqual(cover);
    expect(payload.data.changes).toEqual({
      cover: { from: null, to: cover },
    });
  });

  it("includes an attachment cover without storage metadata", () => {
    const cover = {
      kind: "attachment" as const,
      attachmentPublicId: "attachment01",
      size: "full" as const,
    };
    const payload = createCardWebhookPayload(
      "card.updated",
      {
        id: "card-123",
        publicId: "card-pub-123",
        title: "Test Card",
        cover,
        listId: "list-456",
      },
      {
        boardId: "board-789",
        changes: { cover: { from: null, to: cover } },
      },
    );

    expect(payload.data.card.cover).toEqual(cover);
    expect(payload.data.card.cover).not.toHaveProperty("s3Key");
  });
});
