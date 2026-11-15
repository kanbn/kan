import { beforeEach, describe, expect, it, vi } from "vitest";

import * as memberRepo from "@kan/db/repository/member.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";

import { cancelWorkspaceAccess } from "./workspace";

const db = {} as never;
const workspace = {
  id: 5,
  publicId: "ws1234567890",
  slug: "acme",
  createdBy: "user_1",
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(memberRepo, "getPreservableMemberId").mockResolvedValue("user_1");
  vi.spyOn(memberRepo, "pauseMembersExcept").mockResolvedValue(undefined);
  vi.spyOn(workspaceRepo, "update").mockResolvedValue(undefined);
});

describe("cancelWorkspaceAccess", () => {
  it("downgrades to free and resets a custom slug to the publicId", async () => {
    vi.spyOn(workspaceRepo, "getByPublicId").mockResolvedValue(
      workspace as never,
    );
    const available = vi
      .spyOn(workspaceRepo, "isWorkspaceSlugAvailable")
      .mockResolvedValue(true);

    await cancelWorkspaceAccess(db, "ws1234567890");

    expect(available).toHaveBeenCalledWith(db, "ws1234567890", 5);
    expect(workspaceRepo.update).toHaveBeenCalledWith(db, "ws1234567890", {
      plan: "free",
      slug: "ws1234567890",
    });
    expect(memberRepo.pauseMembersExcept).toHaveBeenCalledWith(db, 5, "user_1");
  });

  it("leaves the slug alone when it already is the publicId", async () => {
    vi.spyOn(workspaceRepo, "getByPublicId").mockResolvedValue({
      ...workspace,
      slug: "ws1234567890",
    } as never);
    const available = vi.spyOn(workspaceRepo, "isWorkspaceSlugAvailable");

    await cancelWorkspaceAccess(db, "ws1234567890");

    expect(available).not.toHaveBeenCalled();
    expect(workspaceRepo.update).toHaveBeenCalledWith(db, "ws1234567890", {
      plan: "free",
      slug: "ws1234567890",
    });
  });
});
