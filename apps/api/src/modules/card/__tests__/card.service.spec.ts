import { beforeEach, describe, expect, it, vi } from "vitest";

import * as avatarUrls from "@kan/api/utils/avatarUrls";
import * as notifications from "@kan/api/utils/notifications";
import * as permissions from "@kan/api/utils/permissions";
import * as webhook from "@kan/api/utils/webhook";
import * as cardRepo from "@kan/db/repository/card.repo";
import { CardLabelBoardError } from "@kan/db/repository/card.repo";
import * as cardActivityRepo from "@kan/db/repository/cardActivity.repo";
import * as cardCommentRepo from "@kan/db/repository/cardComment.repo";
import * as labelRepo from "@kan/db/repository/label.repo";
import * as listRepo from "@kan/db/repository/list.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import * as sharedUtils from "@kan/shared/utils";

import { CardService } from "../card.service.js";

const cardMeta = (visibility: "public" | "private" = "private") => ({
  id: 5,
  createdBy: "user_1",
  workspaceId: 1,
  workspaceVisibility: visibility,
  listName: "To do",
  boardId: 2,
  boardType: "regular",
  boardPublicId: "board_123456",
  boardName: "Board",
});

const list = {
  id: 7,
  publicId: "list_1234567",
  name: "To do",
  workspaceId: 1,
  boardId: 2,
  boardType: "regular",
  boardPublicId: "board_123456",
  boardName: "Board",
};

const cardDetail = {
  publicId: "card_1234567",
  dueDate: new Date("2026-03-01T00:00:00.000Z"),
  attachments: [],
  activities: [{ createdAt: new Date("2026-01-01T00:00:00.000Z") }],
  list: { board: { workspace: { members: [] } } },
};

let service: CardService;

beforeEach(() => {
  vi.restoreAllMocks();
  for (const fn of [
    "assertPermission",
    "assertBoardAccess",
    "assertCanEdit",
    "assertCanDelete",
  ] as const)
    vi.spyOn(permissions, fn).mockResolvedValue(undefined);
  vi.spyOn(permissions, "filterBoardAssignable").mockImplementation(((
    _db: unknown,
    _board: unknown,
    members: unknown[],
  ) => Promise.resolve(members)) as never);
  vi.spyOn(avatarUrls, "createAvatarUrlResolver").mockReturnValue(
    vi.fn() as never,
  );
  vi.spyOn(webhook, "sendWebhooksForWorkspace").mockResolvedValue(
    undefined as never,
  );
  vi.spyOn(notifications, "sendMentionEmails").mockResolvedValue(
    undefined as never,
  );
  vi.spyOn(cardActivityRepo, "create").mockResolvedValue(undefined as never);
  vi.spyOn(cardActivityRepo, "bulkCreate").mockResolvedValue(
    undefined as never,
  );
  vi.spyOn(cardRepo, "getWorkspaceAndCardIdByCardPublicId").mockResolvedValue(
    cardMeta() as never,
  );
  service = new CardService();
});

describe("CardService.byId", () => {
  beforeEach(() => {
    vi.spyOn(cardRepo, "getWithListAndMembersByPublicId").mockResolvedValue(
      cardDetail as never,
    );
  });

  it("lets anonymous callers read cards on public boards", async () => {
    vi.spyOn(cardRepo, "getWorkspaceAndCardIdByCardPublicId").mockResolvedValue(
      cardMeta("public") as never,
    );

    const result = await service.byId({ cardPublicId: "card_1234567" });

    expect(permissions.assertPermission).not.toHaveBeenCalled();
    expect(result.dueDate).toBe("2026-03-01T00:00:00.000Z");
    expect(result.activities[0]?.createdAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("rejects anonymous callers on private boards", async () => {
    await expect(
      service.byId({ cardPublicId: "card_1234567" }),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("checks card:view and board access for signed-in callers on private boards", async () => {
    await service.byId({ cardPublicId: "card_1234567", userId: "user_2" });

    expect(permissions.assertPermission).toHaveBeenCalledWith(
      expect.anything(),
      "user_2",
      1,
      "card:view",
    );
    expect(permissions.assertBoardAccess).toHaveBeenCalled();
  });
});

describe("CardService.getActivities", () => {
  it("rejects anonymous callers on private boards", async () => {
    await expect(
      service.getActivities({
        cardPublicId: "card_1234567",
        limit: 10,
        order: "oldest",
      }),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("passes the cursor through and returns an ISO next cursor", async () => {
    vi.spyOn(cardRepo, "getWorkspaceAndCardIdByCardPublicId").mockResolvedValue(
      cardMeta("public") as never,
    );
    const paginated = vi
      .spyOn(cardActivityRepo, "getPaginatedActivities")
      .mockResolvedValue({
        activities: [],
        hasMore: true,
        nextCursor: {
          createdAt: new Date("2026-01-02T00:00:00.000Z"),
          publicId: "activity_123",
        },
      } as never);

    const result = await service.getActivities({
      cardPublicId: "card_1234567",
      limit: 5,
      cursor: "2026-01-03T00:00:00.000Z",
      cursorPublicId: "activity_999",
      order: "oldest",
    });

    expect(paginated).toHaveBeenCalledWith(expect.anything(), 5, {
      limit: 5,
      cursor: {
        createdAt: new Date("2026-01-03T00:00:00.000Z"),
        publicId: "activity_999",
      },
      order: "oldest",
    });
    expect(result).toMatchObject({
      hasMore: true,
      nextCursor: "2026-01-02T00:00:00.000Z",
      nextCursorPublicId: "activity_123",
    });
  });
});

describe("CardService.create", () => {
  const input = {
    title: "Card",
    description: "",
    listPublicId: "list_1234567",
    labelPublicIds: [],
    memberPublicIds: [],
    position: "end" as const,
    userId: "user_1",
    userName: "Henry",
  };

  beforeEach(() => {
    vi.spyOn(listRepo, "getWorkspaceAndListIdByListPublicId").mockResolvedValue(
      list as never,
    );
  });

  it("rejects labels from another board before creating the card", async () => {
    vi.spyOn(labelRepo, "getAllByPublicIds").mockResolvedValue([
      { id: 1, boardId: 99 },
    ] as never);
    const create = vi.spyOn(cardRepo, "create");

    await expect(
      service.create({ ...input, labelPublicIds: ["label_123456"] }),
    ).rejects.toMatchObject({ status: 400 });
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects members who are not on the board before creating the card", async () => {
    vi.spyOn(workspaceRepo, "getAllMembersByPublicIds").mockResolvedValue([
      { id: 3, publicId: "member_12345" },
    ] as never);
    vi.spyOn(permissions, "filterBoardAssignable").mockResolvedValue([]);
    const create = vi.spyOn(cardRepo, "create");

    await expect(
      service.create({ ...input, memberPublicIds: ["member_12345"] }),
    ).rejects.toMatchObject({ status: 400 });
    expect(create).not.toHaveBeenCalled();
  });

  it("creates the card and fires the webhook with the caller's name", async () => {
    vi.spyOn(cardRepo, "create").mockResolvedValue({
      id: 9,
      publicId: "card_new1234",
    } as never);

    const result = await service.create(input);

    expect(result.publicId).toBe("card_new1234");
    const payload = vi.mocked(webhook.sendWebhooksForWorkspace).mock
      .calls[0]?.[2] as { data: { user?: { name: string } } };
    expect(JSON.stringify(payload)).toContain("Henry");
  });
});

describe("CardService.update", () => {
  const existing = {
    id: 5,
    publicId: "card_1234567",
    title: "Old",
    description: null,
    dueDate: null,
    listId: 7,
    list: { publicId: "list_1234567", name: "To do" },
  };
  const updated = {
    id: 5,
    publicId: "card_1234567",
    title: "Old",
    description: null,
    dueDate: new Date("2026-04-01T00:00:00.000Z"),
  };

  beforeEach(() => {
    vi.spyOn(cardRepo, "getByPublicId").mockResolvedValue(existing as never);
  });

  it("rejects moving the card to a list in another workspace", async () => {
    vi.spyOn(listRepo, "getByPublicId").mockResolvedValue({
      ...list,
      workspaceId: 99,
    } as never);

    await expect(
      service.update({
        cardPublicId: "card_1234567",
        listPublicId: "list_other12",
        userId: "user_1",
        userName: "Henry",
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("logs a due date added activity and returns an ISO due date", async () => {
    vi.spyOn(cardRepo, "update").mockResolvedValue(updated as never);

    const result = await service.update({
      cardPublicId: "card_1234567",
      dueDate: updated.dueDate,
      userId: "user_1",
      userName: "Henry",
    });

    expect(result.dueDate).toBe("2026-04-01T00:00:00.000Z");
    expect(cardActivityRepo.bulkCreate).toHaveBeenCalledWith(
      expect.anything(),
      [expect.objectContaining({ type: "card.updated.dueDate.added" })],
    );
  });

  it("unassigns members who are not on the destination board", async () => {
    vi.spyOn(listRepo, "getByPublicId").mockResolvedValue({
      ...list,
      id: 8,
      publicId: "list_other12",
      boardId: 3,
    } as never);
    vi.spyOn(cardRepo, "reorder").mockResolvedValue(updated as never);
    vi.spyOn(cardRepo, "getAssignees").mockResolvedValue([
      { id: 11 },
      { id: 12 },
    ] as never);
    vi.spyOn(permissions, "filterBoardAssignable").mockResolvedValue([
      { id: 11 },
    ] as never);
    const unassign = vi
      .spyOn(cardRepo, "hardDeleteCardMemberRelationship")
      .mockResolvedValue({ success: true } as never);

    await service.update({
      cardPublicId: "card_1234567",
      listPublicId: "list_other12",
      userId: "user_1",
      userName: "Henry",
    });

    expect(unassign).toHaveBeenCalledTimes(1);
    expect(unassign).toHaveBeenCalledWith(expect.anything(), {
      cardId: 5,
      memberId: 12,
    });
  });
});

describe("CardService.addOrRemoveLabel", () => {
  beforeEach(() => {
    vi.spyOn(labelRepo, "getByPublicId").mockResolvedValue({ id: 4 } as never);
  });

  it("removes a label that is already on the card", async () => {
    vi.spyOn(cardRepo, "getCardLabelRelationship").mockResolvedValue({
      cardId: 5,
    } as never);
    vi.spyOn(cardRepo, "hardDeleteCardLabelRelationship").mockResolvedValue({
      cardId: 5,
    } as never);

    expect(
      await service.addOrRemoveLabel({
        cardPublicId: "card_1234567",
        labelPublicId: "label_123456",
        userId: "user_1",
      }),
    ).toEqual({ newLabel: false });
  });

  it("maps a label from another board to BAD_REQUEST", async () => {
    vi.spyOn(cardRepo, "getCardLabelRelationship").mockResolvedValue(undefined);
    vi.spyOn(cardRepo, "createCardLabelRelationship").mockRejectedValue(
      new CardLabelBoardError("board_mismatch", 5, 4),
    );

    await expect(
      service.addOrRemoveLabel({
        cardPublicId: "card_1234567",
        labelPublicId: "label_123456",
        userId: "user_1",
      }),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe("CardService.updateComment", () => {
  it("rejects a comment that belongs to another card", async () => {
    vi.spyOn(cardCommentRepo, "getByPublicId").mockResolvedValue({
      id: 1,
      cardId: 99,
    } as never);

    await expect(
      service.updateComment({
        cardPublicId: "card_1234567",
        commentPublicId: "comment_1234",
        comment: "hi",
        userId: "user_1",
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("CardService.duplicate", () => {
  it("refuses to copy labels onto another board before creating the duplicate", async () => {
    vi.spyOn(listRepo, "getWorkspaceAndListIdByListPublicId").mockResolvedValue(
      { ...list, boardId: 3 } as never,
    );
    vi.spyOn(cardRepo, "getWithListAndMembersByPublicId").mockResolvedValue({
      labels: [{ publicId: "label_123456" }],
      members: [],
      checklists: [],
    } as never);
    vi.spyOn(labelRepo, "getAllByPublicIds").mockResolvedValue([
      { id: 4, boardId: 2 },
    ] as never);
    const create = vi.spyOn(cardRepo, "create");

    await expect(
      service.duplicate({
        cardPublicId: "card_1234567",
        listPublicId: "list_other12",
        copyLabels: true,
        copyMembers: false,
        copyChecklists: false,
        userId: "user_1",
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(create).not.toHaveBeenCalled();
  });
});

describe("attachment URLs", () => {
  it("are generated for each attachment on byId", async () => {
    vi.spyOn(cardRepo, "getWorkspaceAndCardIdByCardPublicId").mockResolvedValue(
      cardMeta("public") as never,
    );
    vi.spyOn(cardRepo, "getWithListAndMembersByPublicId").mockResolvedValue({
      ...cardDetail,
      attachments: [
        {
          publicId: "att_12345678",
          contentType: "image/png",
          s3Key: "k",
          originalFilename: "a.png",
          size: 1,
        },
      ],
    } as never);
    vi.spyOn(sharedUtils, "generateAttachmentUrl").mockResolvedValue(
      "https://signed/a.png",
    );

    const result = await service.byId({ cardPublicId: "card_1234567" });

    expect(result.attachments[0]?.url).toBe("https://signed/a.png");
  });
});
