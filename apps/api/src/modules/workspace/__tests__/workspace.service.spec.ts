import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as boardMemberRepo from "@kan/db/repository/boardMember.repo";
import * as subscriptionRepo from "@kan/db/repository/subscription.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import * as workspaceSlugRepo from "@kan/db/repository/workspaceSlug.repo";
import * as avatarUrls from "@kan/server/utils/avatarUrls";
import * as permissions from "@kan/server/utils/permissions";

import { WorkspaceService } from "../workspace.service.js";

const workspace = {
  id: 1,
  publicId: "workspace_12345",
  name: "Acme",
  slug: "acme",
  plan: "free",
};

const created = {
  publicId: "workspace_new",
  name: "Acme",
  slug: "workspace_new",
  description: null,
  plan: "free",
  cardPrefix: "ACM",
};

let service: WorkspaceService;
const originalEnv = process.env.NEXT_PUBLIC_KAN_ENV;

beforeEach(() => {
  vi.restoreAllMocks();
  delete process.env.NEXT_PUBLIC_KAN_ENV;
  vi.spyOn(permissions, "assertPermission").mockResolvedValue(undefined);
  service = new WorkspaceService();
});

afterEach(() => {
  process.env.NEXT_PUBLIC_KAN_ENV = originalEnv;
});

describe("WorkspaceService.checkSlugAvailability", () => {
  it("reports a reserved slug as unavailable and logs the check in cloud", async () => {
    process.env.NEXT_PUBLIC_KAN_ENV = "cloud";
    vi.spyOn(workspaceSlugRepo, "getWorkspaceSlug").mockResolvedValue({
      type: "reserved",
    } as never);
    vi.spyOn(workspaceRepo, "isWorkspaceSlugAvailable").mockResolvedValue(true);
    const logCheck = vi
      .spyOn(workspaceSlugRepo, "createWorkspaceSlugCheck")
      .mockResolvedValue(undefined as never);

    const result = await service.checkSlugAvailability({
      workspaceSlug: "ADMIN",
      userId: "user_1",
    });

    expect(result).toEqual({ isAvailable: false, isReserved: true });
    expect(logCheck).toHaveBeenCalledWith(expect.anything(), {
      slug: "admin",
      userId: "user_1",
      available: false,
      reserved: true,
    });
  });

  it("excludes the current workspace from the taken check and skips logging when self-hosted", async () => {
    vi.spyOn(workspaceSlugRepo, "getWorkspaceSlug").mockResolvedValue(
      undefined,
    );
    vi.spyOn(workspaceRepo, "getByPublicId").mockResolvedValue(
      workspace as never,
    );
    const isAvailable = vi
      .spyOn(workspaceRepo, "isWorkspaceSlugAvailable")
      .mockResolvedValue(true);
    const logCheck = vi.spyOn(workspaceSlugRepo, "createWorkspaceSlugCheck");

    const result = await service.checkSlugAvailability({
      workspaceSlug: "acme",
      workspacePublicId: "workspace_12345",
      userId: "user_1",
    });

    expect(result).toEqual({ isAvailable: true, isReserved: false });
    expect(isAvailable).toHaveBeenCalledWith(expect.anything(), "acme", 1);
    expect(logCheck).not.toHaveBeenCalled();
  });
});

describe("WorkspaceService.byId", () => {
  const withMembers = (showEmailsToMembers: boolean, role: string) => ({
    ...workspace,
    showEmailsToMembers,
    subscriptions: [],
    members: [
      {
        publicId: "member_1",
        email: "henry@kan.bn",
        role,
        createdAt: new Date("2026-01-01"),
        user: {
          id: "user_1",
          name: "Henry",
          email: "henry@kan.bn",
          image: null,
        },
      },
      {
        publicId: "member_2",
        email: "other@kan.bn",
        role: "member",
        createdAt: new Date("2026-01-01"),
        user: null,
      },
    ],
  });

  beforeEach(() => {
    vi.spyOn(avatarUrls, "createAvatarUrlResolver").mockReturnValue(
      vi.fn() as never,
    );
  });

  it("strips member emails for non-admins when showEmailsToMembers is off", async () => {
    vi.spyOn(workspaceRepo, "getByPublicIdWithMembers").mockResolvedValue(
      withMembers(false, "member") as never,
    );

    const result = await service.byId({
      workspacePublicId: "workspace_12345",
      userId: "user_1",
    });

    expect(JSON.stringify(result)).not.toContain("@kan.bn");
    expect(result.members[1]?.user).toEqual({
      id: null,
      name: "anonymous_member_2",
      image: null,
    });
  });

  it("keeps member emails for admins", async () => {
    vi.spyOn(workspaceRepo, "getByPublicIdWithMembers").mockResolvedValue(
      withMembers(false, "admin") as never,
    );

    const result = await service.byId({
      workspacePublicId: "workspace_12345",
      userId: "user_1",
    });

    expect(result.members[1]).toMatchObject({ email: "other@kan.bn" });
  });

  it("throws NOT_FOUND when the workspace does not exist", async () => {
    vi.spyOn(workspaceRepo, "getByPublicIdWithMembers").mockResolvedValue(
      undefined,
    );

    await expect(
      service.byId({ workspacePublicId: "missing_1234", userId: "user_1" }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("WorkspaceService.create", () => {
  it("rejects custom slugs in cloud", async () => {
    process.env.NEXT_PUBLIC_KAN_ENV = "cloud";

    await expect(
      service.create({
        name: "Acme",
        slug: "acme",
        userId: "user_1",
        userEmail: "henry@kan.bn",
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rejects a slug that is already taken", async () => {
    vi.spyOn(workspaceSlugRepo, "getWorkspaceSlug").mockResolvedValue(
      undefined,
    );
    vi.spyOn(workspaceRepo, "isWorkspaceSlugAvailable").mockResolvedValue(
      false,
    );

    await expect(
      service.create({
        name: "Acme",
        slug: "acme",
        userId: "user_1",
        userEmail: "henry@kan.bn",
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: "Workspace slug 'acme' is already taken",
    });
  });

  it("falls back to the public id when slug is an empty string", async () => {
    const create = vi
      .spyOn(workspaceRepo, "create")
      .mockResolvedValue(created as never);

    await service.create({
      name: "Acme",
      slug: "",
      userId: "user_1",
      userEmail: "henry@kan.bn",
    });

    const args = create.mock.calls[0]?.[1] as {
      publicId: string;
      slug: string;
    };
    expect(args.slug).toBe(args.publicId);
  });

  it("links an unused partner slot to the new workspace in cloud", async () => {
    process.env.NEXT_PUBLIC_KAN_ENV = "cloud";
    vi.spyOn(workspaceRepo, "create").mockResolvedValue(created as never);
    vi.spyOn(workspaceRepo, "getAllByUserId").mockResolvedValue([
      { workspace: { publicId: "workspace_other" } },
    ] as never);
    vi.spyOn(
      subscriptionRepo,
      "getFirstActivePartnerSubByWorkspaceIds",
    ).mockResolvedValue({ partnerLicenseKey: "key_1" } as never);
    vi.spyOn(
      subscriptionRepo,
      "getFirstUnlinkedSlotByLicenseKey",
    ).mockResolvedValue({ id: 7, plan: "pro" } as never);
    const updateSub = vi
      .spyOn(subscriptionRepo, "updateById")
      .mockResolvedValue(undefined as never);
    const updateWorkspace = vi
      .spyOn(workspaceRepo, "update")
      .mockResolvedValue(undefined as never);

    const result = await service.create({
      name: "Acme",
      userId: "user_1",
      userEmail: "henry@kan.bn",
    });

    expect(result.plan).toBe("pro");
    const newId = updateWorkspace.mock.calls[0]?.[1];
    expect(updateSub).toHaveBeenCalledWith(expect.anything(), 7, {
      referenceId: newId,
    });
    expect(updateWorkspace).toHaveBeenCalledWith(expect.anything(), newId, {
      plan: "pro",
    });
  });
});

describe("WorkspaceService.update", () => {
  beforeEach(() => {
    vi.spyOn(workspaceRepo, "getByPublicId").mockResolvedValue(
      workspace as never,
    );
    vi.spyOn(workspaceSlugRepo, "getWorkspaceSlug").mockResolvedValue(
      undefined,
    );
  });

  it("forbids slug changes on the free plan in cloud", async () => {
    process.env.NEXT_PUBLIC_KAN_ENV = "cloud";
    vi.spyOn(workspaceRepo, "isWorkspaceSlugAvailable").mockResolvedValue(true);

    await expect(
      service.update({
        workspacePublicId: "workspace_12345",
        userId: "user_1",
        slug: "new-slug",
      }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("throws CONFLICT when the slug is taken", async () => {
    vi.spyOn(workspaceRepo, "isWorkspaceSlugAvailable").mockResolvedValue(
      false,
    );

    await expect(
      service.update({
        workspacePublicId: "workspace_12345",
        userId: "user_1",
        slug: "taken",
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("requires workspace:edit", async () => {
    vi.spyOn(workspaceRepo, "update").mockResolvedValue({ name: "x" } as never);

    await service.update({
      workspacePublicId: "workspace_12345",
      userId: "user_1",
      name: "x",
    });

    expect(permissions.assertPermission).toHaveBeenCalledWith(
      expect.anything(),
      "user_1",
      1,
      "workspace:edit",
    );
  });
});

describe("WorkspaceService.delete", () => {
  it("unlinks partner subscriptions in cloud before hard deleting", async () => {
    process.env.NEXT_PUBLIC_KAN_ENV = "cloud";
    vi.spyOn(workspaceRepo, "getByPublicId").mockResolvedValue(
      workspace as never,
    );
    vi.spyOn(subscriptionRepo, "getByReferenceId").mockResolvedValue([
      { id: 1, partnerLicenseKey: "key_1" },
      { id: 2, partnerLicenseKey: null },
    ] as never);
    const updateSub = vi
      .spyOn(subscriptionRepo, "updateById")
      .mockResolvedValue(undefined as never);
    const hardDelete = vi
      .spyOn(workspaceRepo, "hardDelete")
      .mockResolvedValue(undefined as never);

    const result = await service.delete({
      workspacePublicId: "workspace_12345",
      userId: "user_1",
    });

    expect(result).toEqual({ success: true });
    expect(updateSub).toHaveBeenCalledTimes(1);
    expect(updateSub).toHaveBeenCalledWith(expect.anything(), 1, {
      referenceId: null,
    });
    expect(hardDelete).toHaveBeenCalledWith(
      expect.anything(),
      "workspace_12345",
    );
  });
});

describe("WorkspaceService.search", () => {
  beforeEach(() => {
    vi.spyOn(workspaceRepo, "getByPublicId").mockResolvedValue(
      workspace as never,
    );
    vi.spyOn(workspaceRepo, "searchBoardsAndCards").mockResolvedValue([]);
  });

  it("does not restrict boards for admins", async () => {
    vi.spyOn(permissions, "isWorkspaceAdmin").mockResolvedValue(true);
    const memberBoards = vi.spyOn(boardMemberRepo, "getMemberBoardIds");

    await service.search({
      workspacePublicId: "workspace_12345",
      query: "foo",
      limit: 10,
      userId: "user_1",
    });

    expect(memberBoards).not.toHaveBeenCalled();
    expect(workspaceRepo.searchBoardsAndCards).toHaveBeenCalledWith(
      expect.anything(),
      1,
      "foo",
      10,
      undefined,
    );
  });

  it("restricts non-admins to boards they are members of", async () => {
    vi.spyOn(permissions, "isWorkspaceAdmin").mockResolvedValue(false);
    vi.spyOn(boardMemberRepo, "getMemberBoardIds").mockResolvedValue([3, 4]);

    await service.search({
      workspacePublicId: "workspace_12345",
      query: "foo",
      limit: 10,
      userId: "user_1",
    });

    expect(workspaceRepo.searchBoardsAndCards).toHaveBeenCalledWith(
      expect.anything(),
      1,
      "foo",
      10,
      [3, 4],
    );
  });
});

describe("WorkspaceService.hasAvailablePartnerSlot", () => {
  it("returns false when the user has no workspaces", async () => {
    vi.spyOn(workspaceRepo, "getAllByUserId").mockResolvedValue([]);

    expect(await service.hasAvailablePartnerSlot({ userId: "user_1" })).toBe(
      false,
    );
  });

  it("returns true when a partner licence has an unlinked slot", async () => {
    vi.spyOn(workspaceRepo, "getAllByUserId").mockResolvedValue([
      { workspace: { publicId: "workspace_12345" } },
    ] as never);
    vi.spyOn(
      subscriptionRepo,
      "getFirstActivePartnerSubByWorkspaceIds",
    ).mockResolvedValue({ partnerLicenseKey: "key_1" } as never);
    vi.spyOn(
      subscriptionRepo,
      "getFirstUnlinkedSlotByLicenseKey",
    ).mockResolvedValue({ id: 7 } as never);

    expect(await service.hasAvailablePartnerSlot({ userId: "user_1" })).toBe(
      true,
    );
  });
});
