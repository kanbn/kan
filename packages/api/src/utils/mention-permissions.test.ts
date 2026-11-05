import { beforeEach, describe, expect, it, vi } from "vitest";

import type { dbClient } from "@kan/db/client";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";

import { assertNoNewPausedMentions } from "./mention-permissions";

vi.mock("@kan/db/repository/workspace.repo", () => ({
  getAllMembersByPublicIds: vi.fn(),
}));

const db = {} as dbClient;
const workspaceId = 7;
const activeId = "activeMember1";
const pausedId = "pausedMember1";
const mention = (publicId: string) =>
  `<span data-type="mention" data-id="${publicId}" data-label="Member">@Member</span>`;
const getMembers = vi.mocked(workspaceRepo.getAllMembersByPublicIds);

describe("assertNoNewPausedMentions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a newly mentioned paused member before content is written", async () => {
    getMembers.mockResolvedValueOnce([
      { id: 1, role: "member", status: "paused" },
    ]);

    await expect(
      assertNoNewPausedMentions(db, workspaceId, null, mention(pausedId)),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(getMembers).toHaveBeenCalledWith(db, [pausedId], workspaceId);
  });

  it("allows an existing paused mention to remain during an edit", async () => {
    await expect(
      assertNoNewPausedMentions(
        db,
        workspaceId,
        mention(pausedId),
        `<p>Updated ${mention(pausedId)}</p>`,
      ),
    ).resolves.toBeUndefined();
    expect(getMembers).not.toHaveBeenCalled();
  });

  it("checks only newly added mentions and deduplicates them", async () => {
    getMembers.mockResolvedValueOnce([
      { id: 1, role: "member", status: "paused" },
    ]);

    await expect(
      assertNoNewPausedMentions(
        db,
        workspaceId,
        mention(activeId),
        `${mention(activeId)} ${mention(pausedId)} ${mention(pausedId)}`,
      ),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(getMembers).toHaveBeenCalledWith(db, [pausedId], workspaceId);
  });

  it.each(["active", "invited"])(
    "allows a newly mentioned %s member",
    async (status) => {
      getMembers.mockResolvedValueOnce([
        { id: 1, role: "member", status: status as "active" | "invited" },
      ]);

      await expect(
        assertNoNewPausedMentions(db, workspaceId, null, mention(activeId)),
      ).resolves.toBeUndefined();
    },
  );

  it("rejects a mention outside the card workspace", async () => {
    getMembers.mockResolvedValueOnce([]);

    await expect(
      assertNoNewPausedMentions(db, workspaceId, null, mention(activeId)),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(getMembers).toHaveBeenCalledWith(db, [activeId], workspaceId);
  });
});
