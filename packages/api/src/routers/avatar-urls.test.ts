import { beforeEach, describe, expect, it, vi } from "vitest";

import * as cardRepo from "@kan/db/repository/card.repo";
import * as cardActivityRepo from "@kan/db/repository/cardActivity.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { generateAvatarUrl } from "@kan/shared/utils";

import { assertPermission } from "../utils/permissions";

vi.mock("@kan/db/repository/card.repo", () => ({
  getWorkspaceAndCardIdByCardPublicId: vi.fn(),
  getWithListAndMembersByPublicId: vi.fn(),
}));
vi.mock("@kan/db/repository/cardActivity.repo", () => ({
  getPaginatedActivities: vi.fn(),
}));
vi.mock("@kan/db/repository/cardComment.repo", () => ({}));
vi.mock("@kan/db/repository/checklist.repo", () => ({}));
vi.mock("@kan/db/repository/label.repo", () => ({}));
vi.mock("@kan/db/repository/list.repo", () => ({}));
vi.mock("@kan/db/repository/subscription.repo", () => ({}));
vi.mock("@kan/db/repository/workspace.repo", () => ({
  getByPublicIdWithMembers: vi.fn(),
}));
vi.mock("@kan/db/repository/workspaceSlug.repo", () => ({}));
vi.mock("@kan/db/client", () => ({
  createDrizzleClient: vi.fn(() => ({})),
}));
vi.mock("@kan/auth/server", () => ({
  initAuth: vi.fn(() => ({ api: {} })),
}));
vi.mock("@kan/shared/utils", () => ({
  generateAttachmentUrl: vi.fn(),
  generateAvatarUrl: vi.fn(),
  generateUID: vi.fn(),
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

const mockGetCard = vi.mocked(cardRepo.getWorkspaceAndCardIdByCardPublicId);
const mockGetCardWithMembers = vi.mocked(
  cardRepo.getWithListAndMembersByPublicId,
);
const mockGetActivities = vi.mocked(cardActivityRepo.getPaginatedActivities);
const mockGetWorkspace = vi.mocked(workspaceRepo.getByPublicIdWithMembers);
const mockGenerateAvatarUrl = vi.mocked(generateAvatarUrl);
const mockAssertPermission = vi.mocked(assertPermission);

const avatarKey = "avatars/shared.png";
const signedAvatarUrl = "https://example.com/avatars/shared.png";
const now = new Date("2026-09-04T12:00:00.000Z");
const ctx = {
  db: {} as never,
  user: {
    id: "user-1",
    name: "Test User",
    email: "test@example.com",
  },
} as never;

const createWorkspaceMember = (publicId: string, userId: string) => ({
  publicId,
  email: `${userId}@example.com`,
  role: userId === "user-1" ? "admin" : "member",
  status: "active",
  createdAt: now,
  user: {
    id: userId,
    name: `User ${userId}`,
    email: `${userId}@example.com`,
    image: avatarKey,
  },
});

const createActivity = (publicId: string, withMember: boolean) => ({
  publicId,
  type: withMember ? "card.updated.member.added" : "card.created",
  createdAt: now,
  fromIndex: null,
  toIndex: null,
  fromTitle: null,
  toTitle: null,
  fromDescription: null,
  toDescription: null,
  fromDueDate: null,
  toDueDate: null,
  fromList: null,
  toList: null,
  label: null,
  member: withMember
    ? {
        publicId: "member-2",
        user: {
          id: "user-2",
          name: "Member User",
          email: "member@example.com",
          image: avatarKey,
        },
      }
    : null,
  user: {
    id: "user-1",
    name: "Activity User",
    email: "activity@example.com",
    image: avatarKey,
  },
  comment: null,
  attachment: null,
});

describe("avatar URL resolution in routers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertPermission.mockResolvedValue(undefined);
    mockGenerateAvatarUrl.mockResolvedValue(signedAvatarUrl);
  });

  it("reuses avatar URLs for duplicate workspace member image keys", async () => {
    mockGetWorkspace.mockResolvedValue({
      id: 7,
      publicId: "workspace-12",
      name: "Workspace",
      slug: "workspace",
      showEmailsToMembers: true,
      weekStartDay: null,
      members: [
        createWorkspaceMember("member-1", "user-1"),
        createWorkspaceMember("member-2", "user-2"),
      ],
      subscriptions: [],
    } as never);

    const { workspaceRouter } = await import("./workspace");
    const result = await workspaceRouter.createCaller(ctx).byId({
      workspacePublicId: "workspace-12",
    });

    expect(result.members.map((member) => member.user?.image)).toEqual([
      signedAvatarUrl,
      signedAvatarUrl,
    ]);
    expect(mockGenerateAvatarUrl).toHaveBeenCalledTimes(1);
  });

  it("reuses avatar URLs for duplicate card workspace member image keys", async () => {
    mockGetCard.mockResolvedValue({
      id: 17,
      workspaceId: 7,
      workspaceVisibility: "public",
    } as never);
    mockGetCardWithMembers.mockResolvedValue({
      publicId: "card-12345678",
      title: "Card",
      description: null,
      cardNumber: 1,
      index: 1,
      dueDate: null,
      createdBy: "user-1",
      labels: [],
      attachments: [],
      checklists: [],
      list: {
        publicId: "list-12345678",
        name: "List",
        board: {
          publicId: "board-1234567",
          name: "Board",
          labels: [],
          lists: [],
          workspace: {
            publicId: "workspace-12",
            cardPrefix: "KAN",
            members: [
              createWorkspaceMember("member-1", "user-1"),
              createWorkspaceMember("member-2", "user-2"),
            ],
          },
        },
      },
      members: [],
      activities: [],
    } as never);

    const { cardRouter } = await import("./card");
    const result = await cardRouter.createCaller(ctx).byId({
      cardPublicId: "card-12345678",
    });

    expect(
      result.list.board.workspace.members.map((member) => member.user?.image),
    ).toEqual([signedAvatarUrl, signedAvatarUrl]);
    expect(mockGenerateAvatarUrl).toHaveBeenCalledTimes(1);
  });

  it("shares one resolver across activity users and member users", async () => {
    mockGetCard.mockResolvedValue({
      id: 17,
      workspaceId: 7,
      workspaceVisibility: "public",
    } as never);
    mockGetActivities.mockResolvedValue({
      activities: [
        createActivity("activity-01", false),
        createActivity("activity-02", true),
      ],
      hasMore: false,
      nextCursor: undefined,
    } as never);

    const { cardRouter } = await import("./card");
    const result = await cardRouter.createCaller(ctx).getActivities({
      cardPublicId: "card-12345678",
      limit: 100,
    });

    expect(result.activities[0]?.user?.image).toBe(signedAvatarUrl);
    expect(result.activities[1]?.user?.image).toBe(signedAvatarUrl);
    expect(result.activities[1]?.member?.user?.image).toBe(signedAvatarUrl);
    expect(mockGenerateAvatarUrl).toHaveBeenCalledTimes(1);
  });
});
