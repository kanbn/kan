import { beforeEach, describe, expect, it, vi } from "vitest";

import * as cardRepo from "@kan/db/repository/card.repo";
import * as cardCommentRepo from "@kan/db/repository/cardComment.repo";
import * as listRepo from "@kan/db/repository/list.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";

vi.mock("@kan/db/repository/card.repo", () => ({
  create: vi.fn(),
  update: vi.fn(),
  getByPublicId: vi.fn(),
  getWorkspaceAndCardIdByCardPublicId: vi.fn(),
}));
vi.mock("@kan/db/repository/cardComment.repo", () => ({
  create: vi.fn(),
  update: vi.fn(),
  getByPublicId: vi.fn(),
}));
vi.mock("@kan/db/repository/cardActivity.repo", () => ({
  create: vi.fn(),
  bulkCreate: vi.fn(),
}));
vi.mock("@kan/db/repository/list.repo", () => ({
  getWorkspaceAndListIdByListPublicId: vi.fn(),
}));
vi.mock("@kan/db/repository/label.repo", () => ({
  getAllByPublicIds: vi.fn(),
}));
vi.mock("@kan/db/repository/workspace.repo", () => ({
  getAllMembersByPublicIds: vi.fn(),
}));
vi.mock("../utils/notifications", () => ({
  sendMentionEmails: vi.fn(),
}));
vi.mock("../utils/permissions", () => ({
  assertPermission: vi.fn(),
  assertCanEdit: vi.fn(),
  assertBoardAccess: vi.fn(),
  filterBoardAssignable: vi.fn(
    (_db: unknown, _board: unknown, members: unknown) =>
      Promise.resolve(members),
  ),
}));
vi.mock("../utils/webhook", () => ({
  createCardWebhookPayload: vi.fn(() => ({})),
  sendWebhooksForWorkspace: vi.fn(() => Promise.resolve()),
}));

const db = {} as never;
const ctx = { user: { id: "user-123" }, db } as never;
const cardPublicId = "card-12345678";
const memberPublicId = "pausedMember1";
const mention = `<span data-type="mention" data-id="${memberPublicId}" data-label="Member">@Member</span>`;

describe("card mention eligibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(workspaceRepo.getAllMembersByPublicIds).mockResolvedValue([
      { id: 21, role: "member", status: "paused" },
    ]);
    vi.mocked(cardRepo.getWorkspaceAndCardIdByCardPublicId).mockResolvedValue({
      id: 17,
      workspaceId: 7,
      workspaceVisibility: "private",
      listPublicId: "list-12345678",
      listName: "Todo",
      boardId: 3,
      boardType: "regular",
      boardPublicId: "board-1234567",
      boardName: "Board",
      createdBy: "user-123",
    });
  });

  it("rejects a paused mention before creating a card", async () => {
    const { cardRouter } = await import("./card");
    vi.mocked(listRepo.getWorkspaceAndListIdByListPublicId).mockResolvedValue({
      id: 11,
      publicId: "list-12345678",
      name: "Todo",
      createdBy: "user-123",
      workspaceId: 7,
      boardId: 3,
      boardType: "regular",
      boardPublicId: "board-1234567",
      boardName: "Board",
    });

    await expect(
      cardRouter.createCaller(ctx).create({
        title: "A card",
        description: mention,
        listPublicId: "list-12345678",
        labelPublicIds: [],
        memberPublicIds: [],
        position: "end",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(cardRepo.create).not.toHaveBeenCalled();
  });

  it("rejects a paused mention before creating a comment", async () => {
    const { cardRouter } = await import("./card");

    await expect(
      cardRouter
        .createCaller(ctx)
        .addComment({ cardPublicId, comment: mention }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(cardCommentRepo.create).not.toHaveBeenCalled();
  });

  it("rejects a new paused mention before updating a comment", async () => {
    const { cardRouter } = await import("./card");
    vi.mocked(cardCommentRepo.getByPublicId).mockResolvedValue({
      id: 4,
      publicId: "comment-12345",
      cardId: 17,
      comment: "Previous comment",
      createdBy: "user-123",
    });

    await expect(
      cardRouter.createCaller(ctx).updateComment({
        cardPublicId,
        commentPublicId: "comment-12345",
        comment: mention,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(cardCommentRepo.update).not.toHaveBeenCalled();
  });

  it("rejects a new paused mention before updating a description", async () => {
    const { cardRouter } = await import("./card");
    vi.mocked(cardRepo.getByPublicId).mockResolvedValue({
      id: 17,
      publicId: cardPublicId,
      title: "A card",
      description: "Previous description",
      listId: 11,
      dueDate: null,
      list: { publicId: "list-12345678", name: "Todo" },
    });

    await expect(
      cardRouter
        .createCaller(ctx)
        .update({ cardPublicId, description: mention }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(cardRepo.update).not.toHaveBeenCalled();
  });
});
