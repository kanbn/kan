import { beforeEach, describe, expect, it, vi } from "vitest";

import * as boardMemberRepo from "@kan/db/repository/boardMember.repo";

import { filterBoardAssignable } from "./permissions";

vi.mock("@kan/db/repository/boardMember.repo", () => ({
  getWorkspaceMemberIds: vi.fn(),
}));
vi.mock("@kan/db/repository/member.repo", () => ({}));
vi.mock("@kan/db/repository/permission.repo", () => ({}));

const db = {} as never;
const admin = { id: 1, role: "admin" };
const onBoard = { id: 2, role: "member" };
const offBoard = { id: 3, role: "member" };

describe("filterBoardAssignable", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps workspace admins and board members on regular boards", async () => {
    vi.mocked(boardMemberRepo.getWorkspaceMemberIds).mockResolvedValueOnce([2]);

    await expect(
      filterBoardAssignable(db, { id: 9, type: "regular" }, [
        admin,
        onBoard,
        offBoard,
      ]),
    ).resolves.toEqual([admin, onBoard]);
  });

  it("leaves template boards open to the whole workspace", async () => {
    await expect(
      filterBoardAssignable(db, { id: 9, type: "template" }, [offBoard]),
    ).resolves.toEqual([offBoard]);
    expect(boardMemberRepo.getWorkspaceMemberIds).not.toHaveBeenCalled();
  });
});
