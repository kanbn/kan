import { beforeEach, describe, expect, it, vi } from "vitest";

import type { dbClient } from "@kan/db/client";

import { sendMentionEmails } from "./notifications";

const mocks = vi.hoisted(() => ({
  getCard: vi.fn(),
  getMembers: vi.fn(),
  createNotification: vi.fn(),
  getUser: vi.fn(),
  getWorkspace: vi.fn(),
  sendEmail: vi.fn(),
  log: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("next-runtime-env", () => ({
  env: vi.fn(() => "https://kan.example.com"),
}));

vi.mock("@kan/db/repository/card.repo", () => ({
  getWithListAndMembersByPublicId: mocks.getCard,
}));

vi.mock("@kan/db/repository/member.repo", () => ({
  getByPublicIdsWithUsers: mocks.getMembers,
}));

vi.mock("@kan/db/repository/notification.repo", () => ({
  create: mocks.createNotification,
}));

vi.mock("@kan/db/repository/user.repo", () => ({
  getById: mocks.getUser,
}));

vi.mock("@kan/db/repository/workspace.repo", () => ({
  getByPublicId: mocks.getWorkspace,
}));

vi.mock("@kan/email", () => ({
  sendEmail: mocks.sendEmail,
}));

vi.mock("@kan/logger", () => ({
  createLogger: vi.fn(() => mocks.log),
}));

const db = {} as dbClient;
const authorUserId = "author-user-id";
const mentionedMemberPublicId = "memberPublic1";
const anotherMemberPublicId = "memberPublic2";

const mention = (publicId: string) =>
  `<span data-type="mention" data-id="${publicId}" data-label="Member">@Member</span>`;

describe("sendMentionEmails", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getCard.mockResolvedValue({
      id: 42,
      title: "A card",
      list: {
        board: {
          name: "A board",
          workspace: { publicId: "workspace-public-id" },
        },
      },
    });
    mocks.getWorkspace.mockResolvedValue({ id: 7 });
    mocks.getUser.mockResolvedValue({
      id: authorUserId,
      name: "Author",
      email: "author@example.com",
    });
    mocks.getMembers.mockResolvedValue([
      {
        email: "member@example.com",
        user: { id: "mentioned-user-id", email: "member@example.com" },
      },
    ]);
    mocks.sendEmail.mockResolvedValue(undefined);
    mocks.createNotification.mockResolvedValue(undefined);
  });

  it("notifies only members added by the current edit", async () => {
    await sendMentionEmails({
      db,
      cardPublicId: "card-public-id",
      previousHtml: mention(mentionedMemberPublicId),
      nextHtml: `${mention(mentionedMemberPublicId)} ${mention(anotherMemberPublicId)}`,
      commenterUserId: authorUserId,
      commentId: 21,
    });

    expect(mocks.getMembers).toHaveBeenCalledWith(
      db,
      [anotherMemberPublicId],
      7,
    );
    expect(mocks.sendEmail).toHaveBeenCalledOnce();
  });

  it("records the notification only after SMTP accepts the email", async () => {
    await sendMentionEmails({
      db,
      cardPublicId: "card-public-id",
      previousHtml: null,
      nextHtml: mention(mentionedMemberPublicId),
      commenterUserId: authorUserId,
      commentId: 21,
    });

    expect(mocks.sendEmail).toHaveBeenCalledWith(
      "member@example.com",
      "Author mentioned you in a comment on A card",
      "MENTION",
      {
        commenterName: "Author",
        boardName: "A board",
        cardTitle: "A card",
        cardUrl: "https://kan.example.com/cards/card-public-id",
      },
    );
    expect(mocks.createNotification).toHaveBeenCalledWith(db, {
      type: "mention",
      userId: "mentioned-user-id",
      cardId: 42,
      commentId: 21,
    });
    expect(mocks.sendEmail.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.createNotification.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it("does not record a notification when email delivery fails", async () => {
    const error = new Error("SMTP rejected the message");
    mocks.sendEmail.mockRejectedValue(error);

    await expect(
      sendMentionEmails({
        db,
        cardPublicId: "card-public-id",
        previousHtml: null,
        nextHtml: mention(mentionedMemberPublicId),
        commenterUserId: authorUserId,
      }),
    ).resolves.toBeUndefined();

    expect(mocks.createNotification).not.toHaveBeenCalled();
    expect(mocks.log.error).toHaveBeenCalledWith(
      {
        err: error,
        email: "member@example.com",
        cardPublicId: "card-public-id",
      },
      "Failed to send mention email",
    );
  });

  it("reports a recording failure separately after sending the email", async () => {
    const error = new Error("Database unavailable");
    mocks.createNotification.mockRejectedValue(error);

    await sendMentionEmails({
      db,
      cardPublicId: "card-public-id",
      previousHtml: null,
      nextHtml: mention(mentionedMemberPublicId),
      commenterUserId: authorUserId,
    });

    expect(mocks.sendEmail).toHaveBeenCalledOnce();
    expect(mocks.log.error).toHaveBeenCalledWith(
      {
        err: error,
        email: "member@example.com",
        cardPublicId: "card-public-id",
      },
      "Failed to record mention notification",
    );
  });

  it("does not email the author or pending members", async () => {
    mocks.getMembers.mockResolvedValue([
      {
        email: "author@example.com",
        user: { id: authorUserId, email: "author@example.com" },
      },
      {
        email: "pending@example.com",
        user: null,
      },
    ]);

    await sendMentionEmails({
      db,
      cardPublicId: "card-public-id",
      previousHtml: null,
      nextHtml: `${mention(mentionedMemberPublicId)} ${mention(anotherMemberPublicId)}`,
      commenterUserId: authorUserId,
    });

    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.createNotification).not.toHaveBeenCalled();
  });

  it("allows the same member to be notified by another content event", async () => {
    await sendMentionEmails({
      db,
      cardPublicId: "card-public-id",
      previousHtml: null,
      nextHtml: mention(mentionedMemberPublicId),
      commenterUserId: authorUserId,
      commentId: 21,
    });
    await sendMentionEmails({
      db,
      cardPublicId: "card-public-id",
      previousHtml: null,
      nextHtml: mention(mentionedMemberPublicId),
      commenterUserId: authorUserId,
      commentId: 22,
    });

    expect(mocks.sendEmail).toHaveBeenCalledTimes(2);
    expect(mocks.createNotification).toHaveBeenCalledTimes(2);
  });
});
