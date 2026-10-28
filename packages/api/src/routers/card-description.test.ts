import { describe, expect, it, vi } from "vitest";

import * as cardRepo from "@kan/db/repository/card.repo";
import * as cardActivityRepo from "@kan/db/repository/cardActivity.repo";

import { sendMentionEmails } from "../utils/notifications";
import { assertCanEdit } from "../utils/permissions";
import {
  createCardWebhookPayload,
  sendWebhooksForWorkspace,
} from "../utils/webhook";

vi.mock("@kan/db/repository/card.repo", () => ({
  getWorkspaceAndCardIdByCardPublicId: vi.fn(),
  getByPublicId: vi.fn(),
  update: vi.fn(),
  reorder: vi.fn(),
}));
vi.mock("@kan/db/repository/cardActivity.repo", () => ({
  bulkCreate: vi.fn(),
}));
vi.mock("../utils/notifications", () => ({
  sendMentionEmails: vi.fn(),
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

describe("card description updates", () => {
  it("stores an empty editor document as null", async () => {
    const mockDb = {} as never;
    const cardPublicId = "card-12345678";
    const ctx = {
      user: {
        id: "user-123",
        name: "Test User",
        email: "test@example.com",
      },
      db: mockDb,
    } as never;

    vi.mocked(assertCanEdit).mockResolvedValue(undefined);
    vi.mocked(cardRepo.getWorkspaceAndCardIdByCardPublicId).mockResolvedValue({
      id: 1,
      createdBy: "user-123",
      workspaceId: 2,
      workspaceVisibility: "private",
      listPublicId: "list-12345678",
      listName: "Todo",
      boardPublicId: "board-1234567",
      boardName: "Board",
    });
    vi.mocked(cardRepo.getByPublicId).mockResolvedValue({
      id: 1,
      publicId: cardPublicId,
      title: "Card",
      description: "<p>Existing description</p>",
      listId: 3,
      dueDate: null,
      list: {
        publicId: "list-12345678",
        name: "Todo",
      },
    });
    vi.mocked(cardRepo.update).mockResolvedValue({
      id: 1,
      publicId: cardPublicId,
      title: "Card",
      description: null,
      dueDate: null,
    });
    vi.mocked(cardActivityRepo.bulkCreate).mockResolvedValue([]);
    vi.mocked(sendWebhooksForWorkspace).mockResolvedValue(undefined);

    const { cardRouter } = await import("./card");

    await cardRouter.createCaller(ctx).update({
      cardPublicId,
      description: "<p></p>",
    });

    expect(cardRepo.update).toHaveBeenCalledWith(
      mockDb,
      { description: null },
      { cardPublicId },
    );
    expect(cardActivityRepo.bulkCreate).toHaveBeenCalledWith(mockDb, [
      expect.objectContaining({
        type: "card.updated.description",
        fromDescription: "<p>Existing description</p>",
        toDescription: undefined,
      }),
    ]);
    expect(sendMentionEmails).not.toHaveBeenCalled();
    expect(createCardWebhookPayload).toHaveBeenCalledWith(
      "card.updated",
      expect.objectContaining({ description: null }),
      expect.objectContaining({
        changes: {
          description: {
            from: "<p>Existing description</p>",
            to: null,
          },
        },
      }),
    );
  });
});
