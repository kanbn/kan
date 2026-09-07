import { beforeEach, describe, expect, it, vi } from "vitest";

import * as cardRepo from "@kan/db/repository/card.repo";

import { assertCanEdit } from "../utils/permissions";
import {
  createCardWebhookPayload,
  sendWebhooksForWorkspace,
} from "../utils/webhook";

vi.mock("@kan/db/repository/card.repo", () => ({
  getWorkspaceAndCardIdByCardPublicId: vi.fn(),
  getByPublicId: vi.fn(),
  updateCover: vi.fn(),
}));
vi.mock("../utils/permissions", () => ({
  assertCanDelete: vi.fn(),
  assertCanEdit: vi.fn(),
  assertPermission: vi.fn(),
}));
vi.mock("../utils/webhook", () => ({
  createCardWebhookPayload: vi.fn(() => ({})),
  sendWebhooksForWorkspace: vi.fn(() => Promise.resolve()),
}));

const cardPublicId = "card-12345678";
const mockDb = {} as never;
const ctx = {
  user: {
    id: "user-123",
    name: "Test User",
    email: "test@example.com",
  },
  db: mockDb,
} as never;

const cardMeta = {
  id: 1,
  createdBy: "user-123",
  workspaceId: 2,
  workspaceVisibility: "private" as const,
  listPublicId: "list-12345678",
  listName: "Todo",
  boardPublicId: "board-1234567",
  boardName: "Board",
};

const existingCard = {
  id: 1,
  publicId: cardPublicId,
  title: "Card",
  description: null,
  listId: 3,
  dueDate: null,
  coverColourCode: null,
  coverSize: "normal" as const,
  list: {
    publicId: "list-12345678",
    name: "Todo",
  },
};

describe("card cover updates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertCanEdit).mockResolvedValue(undefined);
    vi.mocked(cardRepo.getWorkspaceAndCardIdByCardPublicId).mockResolvedValue(
      cardMeta,
    );
    vi.mocked(cardRepo.getByPublicId).mockResolvedValue(existingCard);
    vi.mocked(sendWebhooksForWorkspace).mockResolvedValue(undefined);
  });

  it("sets a colour cover through the focused mutation", async () => {
    vi.mocked(cardRepo.updateCover).mockResolvedValue({
      id: 1,
      publicId: cardPublicId,
      title: "Card",
      description: null,
      dueDate: null,
      coverColourCode: "#0d9488",
      coverAttachmentId: null,
      coverSize: "normal",
    });

    const { cardRouter } = await import("./card");
    const result = await cardRouter.createCaller(ctx).updateCover({
      cardPublicId,
      cover: {
        kind: "colour",
        colourCode: "#0d9488",
      },
    });

    expect(assertCanEdit).toHaveBeenCalledWith(
      mockDb,
      "user-123",
      2,
      "card:edit",
      "user-123",
    );
    expect(cardRepo.updateCover).toHaveBeenCalledWith(mockDb, {
      cardPublicId,
      coverColourCode: "#0d9488",
      coverSize: "normal",
      createdBy: "user-123",
    });
    expect(result).toEqual({
      publicId: cardPublicId,
      cover: {
        kind: "colour",
        colourCode: "#0d9488",
        size: "normal",
      },
    });
    expect(createCardWebhookPayload).toHaveBeenCalledWith(
      "card.updated",
      expect.objectContaining({ cover: result.cover }),
      expect.objectContaining({
        changes: {
          cover: { from: null, to: result.cover },
        },
      }),
    );
  });

  it("clears a cover without resetting its presentation size", async () => {
    vi.mocked(cardRepo.getByPublicId).mockResolvedValue({
      ...existingCard,
      coverColourCode: "#0d9488",
      coverSize: "full",
    });
    vi.mocked(cardRepo.updateCover).mockResolvedValue({
      id: 1,
      publicId: cardPublicId,
      title: "Card",
      description: null,
      dueDate: null,
      coverColourCode: null,
      coverAttachmentId: null,
      coverSize: "full",
    });

    const { cardRouter } = await import("./card");
    const result = await cardRouter.createCaller(ctx).updateCover({
      cardPublicId,
      cover: null,
    });

    expect(cardRepo.updateCover).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({ coverColourCode: null, coverSize: "full" }),
    );
    expect(result).toEqual({ publicId: cardPublicId, cover: null });
  });

  it("does not write activity or webhooks for an unchanged cover", async () => {
    vi.mocked(cardRepo.getByPublicId).mockResolvedValue({
      ...existingCard,
      coverColourCode: "#0d9488",
    });

    const { cardRouter } = await import("./card");
    const result = await cardRouter.createCaller(ctx).updateCover({
      cardPublicId,
      cover: {
        kind: "colour",
        colourCode: "#0d9488",
      },
    });

    expect(result.cover).toEqual({
      kind: "colour",
      colourCode: "#0d9488",
      size: "normal",
    });
    expect(cardRepo.updateCover).not.toHaveBeenCalled();
    expect(sendWebhooksForWorkspace).not.toHaveBeenCalled();
  });

  it("rejects malformed colour values", async () => {
    const { cardRouter } = await import("./card");

    await expect(
      cardRouter.createCaller(ctx).updateCover({
        cardPublicId,
        cover: {
          kind: "colour",
          colourCode: "red",
        },
      }),
    ).rejects.toThrow();

    expect(cardRepo.updateCover).not.toHaveBeenCalled();
  });
});
