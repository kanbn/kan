import { beforeEach, describe, expect, it, vi } from "vitest";

import type { dbClient } from "@kan/db/client";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";

import { assertNoNewPausedMentions } from "./mention-permissions";

vi.mock("@kan/db/repository/workspace.repo", () => ({
  getAllMembersByPublicIds: vi.fn(),
}));

const db = {} as dbClient;
const mention = (id: string) =>
  `<span data-type="mention" data-id="${id}">@x</span>`;
const paused = "pausedMember1";
const active = "activeMember1";

const members = (...statuses: [string, string][]) =>
  vi.mocked(workspaceRepo.getAllMembersByPublicIds).mockResolvedValue(
    statuses.map(([publicId, status], id) => ({
      id,
      publicId,
      role: "member",
      status,
    })) as never,
  );

beforeEach(() => vi.clearAllMocks());

describe("assertNoNewPausedMentions", () => {
  it("rejects a newly mentioned paused member", async () => {
    members([paused, "paused"]);

    await expect(
      assertNoNewPausedMentions(db, 1, null, mention(paused)),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("allows active members", async () => {
    members([active, "active"]);

    await expect(
      assertNoNewPausedMentions(db, 1, null, mention(active)),
    ).resolves.toBeUndefined();
  });

  it("ignores mentions that were already there", async () => {
    await assertNoNewPausedMentions(
      db,
      1,
      mention(paused),
      `${mention(paused)} edited`,
    );

    expect(workspaceRepo.getAllMembersByPublicIds).not.toHaveBeenCalled();
  });

  it("rejects mentions of people outside the workspace", async () => {
    members();

    await expect(
      assertNoNewPausedMentions(db, 1, null, mention(active)),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("treats the same person mentioned twice as one mention", async () => {
    members([active, "active"]);

    await expect(
      assertNoNewPausedMentions(
        db,
        1,
        null,
        `${mention(active)} and again ${mention(active)}`,
      ),
    ).resolves.toBeUndefined();
  });
});
