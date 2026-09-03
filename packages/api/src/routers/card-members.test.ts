import type { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as cardRepo from "@kan/db/repository/card.repo";
import * as cardActivityRepo from "@kan/db/repository/cardActivity.repo";
import * as listRepo from "@kan/db/repository/list.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";

import { assertPermission } from "../utils/permissions";

vi.mock("@kan/db/repository/card.repo", () => ({
  create: vi.fn(),
  bulkCreateCardWorkspaceMemberRelationships: vi.fn(),
  getWorkspaceAndCardIdByCardPublicId: vi.fn(),
  getCardMemberRelationship: vi.fn(),
  hardDeleteCardMemberRelationship: vi.fn(),
  createCardMemberRelationship: vi.fn(),
  getWithListAndMembersByPublicId: vi.fn(),
}));

vi.mock("@kan/db/repository/cardActivity.repo", () => ({
  bulkCreate: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@kan/db/repository/cardComment.repo", () => ({}));
vi.mock("@kan/db/repository/checklist.repo", () => ({}));
vi.mock("@kan/db/repository/label.repo", () => ({
  getAllByPublicIds: vi.fn(),
}));
vi.mock("@kan/db/repository/list.repo", () => ({
  getWorkspaceAndListIdByListPublicId: vi.fn(),
}));
vi.mock("@kan/db/repository/workspace.repo", () => ({
  getAllMembersByPublicIds: vi.fn(),
  getMemberByPublicId: vi.fn(),
}));
vi.mock("@kan/db/client", () => ({
  createDrizzleClient: vi.fn(() => ({})),
}));
vi.mock("@kan/auth/server", () => ({
  initAuth: vi.fn(() => ({ api: {} })),
}));
vi.mock("@kan/shared/utils", () => ({
  generateAttachmentUrl: vi.fn(),
  generateAvatarUrl: vi.fn(),
  normalizeDescription: vi.fn((description: string) => description),
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

const mockCardCreate = cardRepo.create as ReturnType<typeof vi.fn>;
const mockBulkCreateCardMembers =
  cardRepo.bulkCreateCardWorkspaceMemberRelationships as ReturnType<
    typeof vi.fn
  >;
const mockGetCard = cardRepo.getWorkspaceAndCardIdByCardPublicId as ReturnType<
  typeof vi.fn
>;
const mockGetCardMember = cardRepo.getCardMemberRelationship as ReturnType<
  typeof vi.fn
>;
const mockDeleteCardMember =
  cardRepo.hardDeleteCardMemberRelationship as ReturnType<typeof vi.fn>;
const mockCreateCardMember =
  cardRepo.createCardMemberRelationship as ReturnType<typeof vi.fn>;
const mockGetCardWithMembers =
  cardRepo.getWithListAndMembersByPublicId as ReturnType<typeof vi.fn>;
const mockCreateActivity = cardActivityRepo.create as ReturnType<typeof vi.fn>;
const mockBulkCreateActivities = cardActivityRepo.bulkCreate as ReturnType<
  typeof vi.fn
>;
const mockGetList = listRepo.getWorkspaceAndListIdByListPublicId as ReturnType<
  typeof vi.fn
>;
const mockGetMembers = workspaceRepo.getAllMembersByPublicIds as ReturnType<
  typeof vi.fn
>;
const mockGetMember = workspaceRepo.getMemberByPublicId as ReturnType<
  typeof vi.fn
>;
const mockAssertPermission = assertPermission as ReturnType<typeof vi.fn>;

describe("card member workspace scoping", () => {
  const mockDb = {} as never;
  const mockUser = {
    id: "user-123",
    name: "Test User",
    email: "test@example.com",
  };
  const ctx = { user: mockUser, db: mockDb } as never;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertPermission.mockResolvedValue(undefined);
  });

  describe("create", () => {
    const input = {
      title: "Scoped card",
      description: "",
      listPublicId: "list-12345678",
      labelPublicIds: [],
      memberPublicIds: ["member-a-123"],
      position: "end" as const,
    };

    beforeEach(() => {
      mockGetList.mockResolvedValue({
        id: 11,
        publicId: input.listPublicId,
        name: "Inbox",
        boardPublicId: "board-1234567",
        boardName: "Board",
        workspaceId: 7,
      });
      mockCardCreate.mockResolvedValue({
        id: 17,
        publicId: "card-12345678",
      });
      mockGetMembers.mockResolvedValue([{ id: 21, status: "active" }]);
      mockBulkCreateCardMembers.mockResolvedValue([
        { cardId: 17, workspaceMemberId: 21 },
      ]);
      mockBulkCreateActivities.mockResolvedValue(undefined);
    });

    it("scopes member lookup to the list workspace", async () => {
      const { cardRouter } = await import("./card");

      await cardRouter.createCaller(ctx).create(input);

      expect(mockGetMembers).toHaveBeenCalledWith(
        mockDb,
        input.memberPublicIds,
        7,
      );
    });

    it("rejects the whole request when any member is outside the workspace", async () => {
      const { cardRouter } = await import("./card");
      mockGetMembers.mockResolvedValueOnce([{ id: 21 }]);

      await expect(
        cardRouter.createCaller(ctx).create({
          ...input,
          memberPublicIds: ["member-a-123", "member-b-123"],
        }),
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
      } satisfies Partial<TRPCError>);

      expect(mockCardCreate).not.toHaveBeenCalled();
      expect(mockBulkCreateCardMembers).not.toHaveBeenCalled();
    });

    it("rejects paused members before creating the card", async () => {
      const { cardRouter } = await import("./card");
      mockGetMembers.mockResolvedValueOnce([{ id: 21, status: "paused" }]);

      await expect(
        cardRouter.createCaller(ctx).create(input),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
      } satisfies Partial<TRPCError>);

      expect(mockCardCreate).not.toHaveBeenCalled();
      expect(mockBulkCreateCardMembers).not.toHaveBeenCalled();
    });
  });

  describe("addOrRemoveMember", () => {
    const input = {
      cardPublicId: "card-12345678",
      workspaceMemberPublicId: "member-a-123",
    };

    beforeEach(() => {
      mockGetCard.mockResolvedValue({ id: 17, workspaceId: 7 });
    });

    it("scopes member lookup to the card workspace", async () => {
      const { cardRouter } = await import("./card");
      mockGetMember.mockResolvedValueOnce(undefined);

      await expect(
        cardRouter.createCaller(ctx).addOrRemoveMember(input),
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
      } satisfies Partial<TRPCError>);

      expect(mockGetMember).toHaveBeenCalledWith(
        mockDb,
        input.workspaceMemberPublicId,
        7,
      );
      expect(mockGetCardMember).not.toHaveBeenCalled();
    });

    it("removes an existing member relationship in the scoped workspace", async () => {
      const { cardRouter } = await import("./card");
      mockGetMember.mockResolvedValueOnce({ id: 21, status: "paused" });
      mockGetCardMember.mockResolvedValueOnce({ cardId: 17, memberId: 21 });
      mockDeleteCardMember.mockResolvedValueOnce({ success: true });
      mockCreateActivity.mockResolvedValueOnce(undefined);

      await expect(
        cardRouter.createCaller(ctx).addOrRemoveMember(input),
      ).resolves.toEqual({ newMember: false });

      expect(mockCreateCardMember).not.toHaveBeenCalled();
    });

    it("rejects assigning a paused member", async () => {
      const { cardRouter } = await import("./card");
      mockGetMember.mockResolvedValueOnce({ id: 21, status: "paused" });
      mockGetCardMember.mockResolvedValueOnce(undefined);

      await expect(
        cardRouter.createCaller(ctx).addOrRemoveMember(input),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
      } satisfies Partial<TRPCError>);

      expect(mockCreateCardMember).not.toHaveBeenCalled();
    });
  });

  describe("duplicate", () => {
    it("does not copy paused member assignments", async () => {
      const { cardRouter } = await import("./card");
      mockGetCard.mockResolvedValueOnce({ id: 17, workspaceId: 7 });
      mockGetList.mockResolvedValueOnce({ id: 11, workspaceId: 7 });
      mockGetCardWithMembers.mockResolvedValueOnce({
        title: "Source card",
        description: "",
        dueDate: null,
        labels: [],
        checklists: [],
        members: [
          { publicId: "active-member" },
          { publicId: "paused-member" },
        ],
      });
      mockCardCreate.mockResolvedValueOnce({
        id: 18,
        publicId: "duplicate-123",
      });
      mockGetMembers.mockResolvedValueOnce([
        { id: 21, status: "active" },
        { id: 22, status: "paused" },
      ]);

      await expect(
        cardRouter.createCaller(ctx).duplicate({
          cardPublicId: "source-card-1",
          listPublicId: "target-list-1",
          copyLabels: false,
          copyMembers: true,
          copyChecklists: false,
        }),
      ).resolves.toEqual({ publicId: "duplicate-123" });

      expect(mockBulkCreateCardMembers).toHaveBeenCalledWith(mockDb, [
        { cardId: 18, workspaceMemberId: 21 },
      ]);
      expect(mockBulkCreateActivities).toHaveBeenCalledWith(mockDb, [
        expect.objectContaining({ workspaceMemberId: 21 }),
      ]);
    });
  });

  describe("duplicate", () => {
    const input = {
      cardPublicId: "card-12345678",
      listPublicId: "list-12345678",
      copyLabels: false,
      copyMembers: true,
      copyChecklists: false,
    };

    it("only copies members from the source card workspace", async () => {
      const { cardRouter } = await import("./card");
      mockGetCard.mockResolvedValueOnce({ id: 17, workspaceId: 7 });
      mockGetList.mockResolvedValueOnce({
        id: 11,
        workspaceId: 7,
      });
      mockGetCardWithMembers.mockResolvedValueOnce({
        title: "Source card",
        description: "",
        dueDate: null,
        members: [{ publicId: "member-a-123" }],
        labels: [],
        checklists: [],
      });
      mockCardCreate.mockResolvedValueOnce({
        id: 18,
        publicId: "copy-12345678",
      });
      mockGetMembers.mockResolvedValueOnce([{ id: 21 }]);
      mockBulkCreateCardMembers.mockResolvedValueOnce([
        { cardId: 18, workspaceMemberId: 21 },
      ]);
      mockBulkCreateActivities.mockResolvedValueOnce(undefined);

      await expect(
        cardRouter.createCaller(ctx).duplicate(input),
      ).resolves.toEqual({ publicId: "copy-12345678" });

      expect(mockGetMembers).toHaveBeenCalledWith(mockDb, ["member-a-123"], 7);
    });
  });
});
