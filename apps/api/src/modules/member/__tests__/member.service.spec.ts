import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as permissions from "@kan/api/utils/permissions";
import * as inviteLinkRepo from "@kan/db/repository/inviteLink.repo";
import * as memberRepo from "@kan/db/repository/member.repo";
import * as permissionRepo from "@kan/db/repository/permission.repo";
import * as subscriptionRepo from "@kan/db/repository/subscription.repo";
import * as userRepo from "@kan/db/repository/user.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import * as stripe from "@kan/stripe";

import * as sessionUtil from "../../../common/session.util.js";
import { MemberService } from "../member.service.js";

const workspace = {
  id: 1,
  publicId: "workspace_12345",
  name: "Acme",
  slug: "acme",
  members: [{ email: "existing@kan.bn" }],
};

const teamSubscription = {
  plan: "team",
  status: "active",
  stripeSubscriptionId: "sub_123",
  unlimitedSeats: false,
  partnerTier: null,
  seats: 5,
};

let service: MemberService;
const originalEnv = process.env.NEXT_PUBLIC_KAN_ENV;

beforeEach(() => {
  vi.restoreAllMocks();
  delete process.env.NEXT_PUBLIC_KAN_ENV;
  vi.spyOn(permissions, "assertPermission").mockResolvedValue(undefined);
  vi.spyOn(permissions, "assertCanManageMember").mockResolvedValue(undefined);
  vi.spyOn(permissions, "assertCanManageRole").mockResolvedValue(undefined);
  vi.spyOn(sessionUtil, "sendMagicLinkInvite").mockResolvedValue({
    status: true,
  } as never);
  service = new MemberService();
});

afterEach(() => {
  process.env.NEXT_PUBLIC_KAN_ENV = originalEnv;
});

describe("MemberService.invite", () => {
  it("invites a new member and sends a magic link (self-hosted, no billing)", async () => {
    vi.spyOn(workspaceRepo, "getByPublicIdWithMembers").mockResolvedValue(
      workspace as never,
    );
    vi.spyOn(userRepo, "getByEmail").mockResolvedValue(undefined);
    vi.spyOn(permissionRepo, "getRoleByWorkspaceIdAndName").mockResolvedValue({
      id: 9,
    } as never);
    vi.spyOn(memberRepo, "create").mockResolvedValue({
      id: 10,
      publicId: "member_new",
    } as never);

    const result = await service.invite({
      workspacePublicId: "workspace_12345",
      email: "new@kan.bn",
      userId: "user_1",
      headers: new Headers(),
    });

    expect(result).toEqual({ id: 10, publicId: "member_new" });
    expect(sessionUtil.sendMagicLinkInvite).toHaveBeenCalled();
  });

  it("throws CONFLICT when the email is already a member", async () => {
    vi.spyOn(workspaceRepo, "getByPublicIdWithMembers").mockResolvedValue(
      workspace as never,
    );

    await expect(
      service.invite({
        workspacePublicId: "workspace_12345",
        email: "existing@kan.bn",
        userId: "user_1",
        headers: new Headers(),
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("throws NOT_FOUND in the cloud environment when there is no active subscription", async () => {
    process.env.NEXT_PUBLIC_KAN_ENV = "cloud";
    vi.spyOn(workspaceRepo, "getByPublicIdWithMembers").mockResolvedValue(
      workspace as never,
    );
    vi.spyOn(subscriptionRepo, "getByReferenceId").mockResolvedValue([]);

    await expect(
      service.invite({
        workspacePublicId: "workspace_12345",
        email: "new@kan.bn",
        userId: "user_1",
        headers: new Headers(),
      }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("throws FORBIDDEN with SEAT_LIMIT_REACHED when the workspace is at its seat limit", async () => {
    process.env.NEXT_PUBLIC_KAN_ENV = "cloud";
    vi.spyOn(workspaceRepo, "getByPublicIdWithMembers").mockResolvedValue(
      workspace as never,
    );
    vi.spyOn(subscriptionRepo, "getByReferenceId").mockResolvedValue([
      { ...teamSubscription, partnerTier: 1 },
    ] as never);
    vi.spyOn(stripe, "updateSubscriptionSeats").mockResolvedValue({
      items: { data: [{ quantity: 5 }] },
    } as never);
    vi.spyOn(memberRepo, "getCountByWorkspaceId").mockResolvedValue(5);

    await expect(
      service.invite({
        workspacePublicId: "workspace_12345",
        email: "new@kan.bn",
        userId: "user_1",
        headers: new Headers(),
      }),
    ).rejects.toMatchObject({
      status: 403,
      message: "SEAT_LIMIT_REACHED",
    });
  });

  it("increments Stripe seats in the cloud environment before creating the member", async () => {
    process.env.NEXT_PUBLIC_KAN_ENV = "cloud";
    vi.spyOn(workspaceRepo, "getByPublicIdWithMembers").mockResolvedValue(
      workspace as never,
    );
    vi.spyOn(subscriptionRepo, "getByReferenceId").mockResolvedValue([
      teamSubscription,
    ] as never);
    const updateSeats = vi
      .spyOn(stripe, "updateSubscriptionSeats")
      .mockResolvedValue({ items: { data: [{ quantity: 6 }] } } as never);
    vi.spyOn(memberRepo, "getCountByWorkspaceId").mockResolvedValue(1);
    vi.spyOn(userRepo, "getByEmail").mockResolvedValue(undefined);
    vi.spyOn(permissionRepo, "getRoleByWorkspaceIdAndName").mockResolvedValue({
      id: 9,
    } as never);
    vi.spyOn(memberRepo, "create").mockResolvedValue({
      id: 10,
      publicId: "member_new",
    } as never);

    await service.invite({
      workspacePublicId: "workspace_12345",
      email: "new@kan.bn",
      userId: "user_1",
      headers: new Headers(),
    });

    expect(updateSeats).toHaveBeenCalledWith("sub_123", 1);
  });

  it("does not touch Stripe when the subscription has unlimited seats", async () => {
    process.env.NEXT_PUBLIC_KAN_ENV = "cloud";
    vi.spyOn(workspaceRepo, "getByPublicIdWithMembers").mockResolvedValue(
      workspace as never,
    );
    vi.spyOn(subscriptionRepo, "getByReferenceId").mockResolvedValue([
      { ...teamSubscription, unlimitedSeats: true },
    ] as never);
    const updateSeats = vi.spyOn(stripe, "updateSubscriptionSeats");
    vi.spyOn(userRepo, "getByEmail").mockResolvedValue(undefined);
    vi.spyOn(permissionRepo, "getRoleByWorkspaceIdAndName").mockResolvedValue({
      id: 9,
    } as never);
    vi.spyOn(memberRepo, "create").mockResolvedValue({
      id: 10,
      publicId: "member_new",
    } as never);

    await service.invite({
      workspacePublicId: "workspace_12345",
      email: "new@kan.bn",
      userId: "user_1",
      headers: new Headers(),
    });

    expect(updateSeats).not.toHaveBeenCalled();
  });

  it("throws INTERNAL_SERVER_ERROR when the Stripe seat increment fails", async () => {
    process.env.NEXT_PUBLIC_KAN_ENV = "cloud";
    vi.spyOn(workspaceRepo, "getByPublicIdWithMembers").mockResolvedValue(
      workspace as never,
    );
    vi.spyOn(subscriptionRepo, "getByReferenceId").mockResolvedValue([
      teamSubscription,
    ] as never);
    vi.spyOn(stripe, "updateSubscriptionSeats").mockRejectedValue(
      new Error("stripe is down"),
    );

    await expect(
      service.invite({
        workspacePublicId: "workspace_12345",
        email: "new@kan.bn",
        userId: "user_1",
        headers: new Headers(),
      }),
    ).rejects.toMatchObject({ status: 500 });
  });

  it("rolls back the member and throws when the magic link invite fails to send", async () => {
    vi.spyOn(workspaceRepo, "getByPublicIdWithMembers").mockResolvedValue(
      workspace as never,
    );
    vi.spyOn(userRepo, "getByEmail").mockResolvedValue(undefined);
    vi.spyOn(permissionRepo, "getRoleByWorkspaceIdAndName").mockResolvedValue({
      id: 9,
    } as never);
    vi.spyOn(memberRepo, "create").mockResolvedValue({
      id: 10,
      publicId: "member_new",
    } as never);
    vi.spyOn(sessionUtil, "sendMagicLinkInvite").mockResolvedValue({
      status: false,
    } as never);
    const softDelete = vi
      .spyOn(memberRepo, "softDelete")
      .mockResolvedValue(undefined as never);

    await expect(
      service.invite({
        workspacePublicId: "workspace_12345",
        email: "new@kan.bn",
        userId: "user_1",
        headers: new Headers(),
      }),
    ).rejects.toMatchObject({ status: 500 });

    expect(softDelete).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ memberId: 10 }),
    );
  });
});

describe("MemberService.delete", () => {
  it("removes the member", async () => {
    vi.spyOn(workspaceRepo, "getByPublicId").mockResolvedValue(
      workspace as never,
    );
    vi.spyOn(memberRepo, "getByPublicId").mockResolvedValue({
      id: 5,
      workspaceId: 1,
    } as never);
    vi.spyOn(memberRepo, "softDelete").mockResolvedValue({
      id: 5,
    } as never);

    const result = await service.delete({
      workspacePublicId: "workspace_12345",
      memberPublicId: "member_12345",
      userId: "user_1",
    });

    expect(result).toEqual({ success: true });
  });

  it("throws NOT_FOUND when the member belongs to a different workspace", async () => {
    vi.spyOn(workspaceRepo, "getByPublicId").mockResolvedValue(
      workspace as never,
    );
    vi.spyOn(memberRepo, "getByPublicId").mockResolvedValue({
      id: 5,
      workspaceId: 999,
    } as never);

    await expect(
      service.delete({
        workspacePublicId: "workspace_12345",
        memberPublicId: "member_12345",
        userId: "user_1",
      }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("decrements Stripe seats in the cloud environment", async () => {
    process.env.NEXT_PUBLIC_KAN_ENV = "cloud";
    vi.spyOn(workspaceRepo, "getByPublicId").mockResolvedValue(
      workspace as never,
    );
    vi.spyOn(memberRepo, "getByPublicId").mockResolvedValue({
      id: 5,
      workspaceId: 1,
    } as never);
    vi.spyOn(memberRepo, "softDelete").mockResolvedValue({ id: 5 } as never);
    vi.spyOn(subscriptionRepo, "getByReferenceId").mockResolvedValue([
      teamSubscription,
    ] as never);
    const updateSeats = vi
      .spyOn(stripe, "updateSubscriptionSeats")
      .mockResolvedValue({ items: { data: [{ quantity: 4 }] } } as never);

    await service.delete({
      workspacePublicId: "workspace_12345",
      memberPublicId: "member_12345",
      userId: "user_1",
    });

    expect(updateSeats).toHaveBeenCalledWith("sub_123", -1);
  });

  it("does not fail the request when the Stripe seat decrement fails", async () => {
    process.env.NEXT_PUBLIC_KAN_ENV = "cloud";
    vi.spyOn(workspaceRepo, "getByPublicId").mockResolvedValue(
      workspace as never,
    );
    vi.spyOn(memberRepo, "getByPublicId").mockResolvedValue({
      id: 5,
      workspaceId: 1,
    } as never);
    vi.spyOn(memberRepo, "softDelete").mockResolvedValue({ id: 5 } as never);
    vi.spyOn(subscriptionRepo, "getByReferenceId").mockResolvedValue([
      teamSubscription,
    ] as never);
    vi.spyOn(stripe, "updateSubscriptionSeats").mockRejectedValue(
      new Error("stripe is down"),
    );

    const result = await service.delete({
      workspacePublicId: "workspace_12345",
      memberPublicId: "member_12345",
      userId: "user_1",
    });

    expect(result).toEqual({ success: true });
  });
});

describe("MemberService.getActiveInviteLink", () => {
  it("returns the active invite link", async () => {
    vi.spyOn(workspaceRepo, "getByPublicId").mockResolvedValue(
      workspace as never,
    );
    vi.spyOn(inviteLinkRepo, "getActiveForWorkspace").mockResolvedValue({
      id: 1,
      code: "code123",
      expiresAt: new Date(Date.now() + 86_400_000),
    } as never);

    const result = await service.getActiveInviteLink({
      workspacePublicId: "workspace_12345",
      userId: "user_1",
    });

    expect(result.isActive).toBe(true);
    expect(result.inviteCode).toBe("code123");
  });

  it("treats an expired invite link as inactive", async () => {
    vi.spyOn(workspaceRepo, "getByPublicId").mockResolvedValue(
      workspace as never,
    );
    vi.spyOn(inviteLinkRepo, "getActiveForWorkspace").mockResolvedValue({
      id: 1,
      code: "code123",
      expiresAt: new Date(Date.now() - 86_400_000),
    } as never);

    const result = await service.getActiveInviteLink({
      workspacePublicId: "workspace_12345",
      userId: "user_1",
    });

    expect(result).toEqual({ isActive: false });
  });
});

describe("MemberService.createInviteLink", () => {
  it("throws FORBIDDEN in the cloud environment without a subscription", async () => {
    process.env.NEXT_PUBLIC_KAN_ENV = "cloud";
    vi.spyOn(workspaceRepo, "getByPublicId").mockResolvedValue(
      workspace as never,
    );
    vi.spyOn(subscriptionRepo, "getByReferenceId").mockResolvedValue([]);

    await expect(
      service.createInviteLink({
        workspacePublicId: "workspace_12345",
        userId: "user_1",
      }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("creates an invite link and deactivates any existing ones", async () => {
    vi.spyOn(workspaceRepo, "getByPublicId").mockResolvedValue(
      workspace as never,
    );
    const deactivate = vi
      .spyOn(inviteLinkRepo, "deactivateAllActiveForWorkspace")
      .mockResolvedValue(undefined as never);
    vi.spyOn(inviteLinkRepo, "createInviteLink").mockResolvedValue({
      publicId: "invite_1",
      code: "code123",
      expiresAt: new Date(),
    } as never);

    const result = await service.createInviteLink({
      workspacePublicId: "workspace_12345",
      userId: "user_1",
    });

    expect(result.inviteCode).toBe("code123");
    expect(deactivate).toHaveBeenCalled();
  });
});

describe("MemberService.getInviteByCode", () => {
  it("throws BAD_REQUEST for an unknown code", async () => {
    vi.spyOn(inviteLinkRepo, "getByCode").mockResolvedValue(undefined);

    await expect(
      service.getInviteByCode({ inviteCode: "bad-code" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("throws BAD_REQUEST for an expired invite", async () => {
    vi.spyOn(inviteLinkRepo, "getByCode").mockResolvedValue({
      publicId: "invite_1",
      status: "active",
      expiresAt: new Date(Date.now() - 86_400_000),
    } as never);

    await expect(
      service.getInviteByCode({ inviteCode: "code123" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("returns invite info for a valid code", async () => {
    vi.spyOn(inviteLinkRepo, "getByCode").mockResolvedValue({
      publicId: "invite_1",
      status: "active",
      expiresAt: null,
    } as never);

    const result = await service.getInviteByCode({ inviteCode: "code123" });

    expect(result).toEqual({
      publicId: "invite_1",
      status: "active",
      expiresAt: null,
    });
  });
});

describe("MemberService.acceptInviteLink", () => {
  const activeInvite = {
    publicId: "invite_1",
    status: "active",
    expiresAt: null,
    workspaceId: 1,
  };

  it("throws BAD_REQUEST for an invalid or expired invite", async () => {
    vi.spyOn(inviteLinkRepo, "getByCode").mockResolvedValue(undefined);

    await expect(
      service.acceptInviteLink({ inviteCode: "bad-code", userId: "user_1" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("throws CONFLICT when the user is already a member", async () => {
    vi.spyOn(inviteLinkRepo, "getByCode").mockResolvedValue(
      activeInvite as never,
    );
    vi.spyOn(workspaceRepo, "getById").mockResolvedValue(workspace as never);
    vi.spyOn(workspaceRepo, "isUserInWorkspace").mockResolvedValue(
      true as never,
    );

    await expect(
      service.acceptInviteLink({ inviteCode: "code123", userId: "user_1" }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("accepts the invite and adds the user as an active member", async () => {
    vi.spyOn(inviteLinkRepo, "getByCode").mockResolvedValue(
      activeInvite as never,
    );
    vi.spyOn(workspaceRepo, "getById").mockResolvedValue(workspace as never);
    vi.spyOn(workspaceRepo, "isUserInWorkspace").mockResolvedValue(
      false as never,
    );
    vi.spyOn(userRepo, "getById").mockResolvedValue({
      id: "user_1",
      email: "user@kan.bn",
    } as never);
    vi.spyOn(permissionRepo, "getRoleByWorkspaceIdAndName").mockResolvedValue({
      id: 9,
    } as never);
    const create = vi
      .spyOn(memberRepo, "create")
      .mockResolvedValue({ id: 10, publicId: "member_new" } as never);

    const result = await service.acceptInviteLink({
      inviteCode: "code123",
      userId: "user_1",
    });

    expect(result).toEqual({
      success: true,
      workspacePublicId: "workspace_12345",
      workspaceSlug: "acme",
    });
    expect(create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: "active", userId: "user_1" }),
    );
  });

  it("throws FORBIDDEN with SEAT_LIMIT_REACHED in the cloud environment at the seat limit", async () => {
    process.env.NEXT_PUBLIC_KAN_ENV = "cloud";
    vi.spyOn(inviteLinkRepo, "getByCode").mockResolvedValue(
      activeInvite as never,
    );
    vi.spyOn(workspaceRepo, "getById").mockResolvedValue(workspace as never);
    vi.spyOn(workspaceRepo, "isUserInWorkspace").mockResolvedValue(
      false as never,
    );
    vi.spyOn(userRepo, "getById").mockResolvedValue({
      id: "user_1",
      email: "user@kan.bn",
    } as never);
    vi.spyOn(subscriptionRepo, "getByReferenceId").mockResolvedValue([
      { ...teamSubscription, partnerTier: 1 },
    ] as never);
    vi.spyOn(stripe, "updateSubscriptionSeats").mockResolvedValue({
      items: { data: [{ quantity: 5 }] },
    } as never);
    vi.spyOn(memberRepo, "getCountByWorkspaceId").mockResolvedValue(5);

    await expect(
      service.acceptInviteLink({ inviteCode: "code123", userId: "user_1" }),
    ).rejects.toMatchObject({
      status: 403,
      message: "SEAT_LIMIT_REACHED",
    });
  });
});

describe("MemberService.updateRole", () => {
  it("updates the member's role", async () => {
    vi.spyOn(workspaceRepo, "getByPublicId").mockResolvedValue(
      workspace as never,
    );
    vi.spyOn(memberRepo, "getByPublicId").mockResolvedValue({
      id: 5,
      workspaceId: 1,
    } as never);
    vi.spyOn(permissionRepo, "getRoleByWorkspaceIdAndName").mockResolvedValue({
      id: 3,
    } as never);
    const updateRole = vi
      .spyOn(memberRepo, "updateRole")
      .mockResolvedValue({ id: 5, role: "admin" } as never);

    const result = await service.updateRole({
      workspacePublicId: "workspace_12345",
      memberPublicId: "member_12345",
      role: "admin",
      userId: "user_1",
    });

    expect(result).toEqual({ success: true, role: "admin" });
    expect(updateRole).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ memberId: 5, role: "admin", roleId: 3 }),
    );
  });

  it("throws NOT_FOUND when the member belongs to a different workspace", async () => {
    vi.spyOn(workspaceRepo, "getByPublicId").mockResolvedValue(
      workspace as never,
    );
    vi.spyOn(memberRepo, "getByPublicId").mockResolvedValue({
      id: 5,
      workspaceId: 999,
    } as never);

    await expect(
      service.updateRole({
        workspacePublicId: "workspace_12345",
        memberPublicId: "member_12345",
        role: "admin",
        userId: "user_1",
      }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("checks assertCanManageMember and assertCanManageRole", async () => {
    vi.spyOn(workspaceRepo, "getByPublicId").mockResolvedValue(
      workspace as never,
    );
    vi.spyOn(memberRepo, "getByPublicId").mockResolvedValue({
      id: 5,
      workspaceId: 1,
    } as never);
    vi.spyOn(permissionRepo, "getRoleByWorkspaceIdAndName").mockResolvedValue({
      id: 3,
    } as never);
    vi.spyOn(memberRepo, "updateRole").mockResolvedValue({
      id: 5,
      role: "guest",
    } as never);

    await service.updateRole({
      workspacePublicId: "workspace_12345",
      memberPublicId: "member_12345",
      role: "guest",
      userId: "user_1",
    });

    expect(permissions.assertCanManageMember).toHaveBeenCalledWith(
      expect.anything(),
      "user_1",
      1,
      5,
    );
    expect(permissions.assertCanManageRole).toHaveBeenCalledWith(
      expect.anything(),
      "user_1",
      1,
      "guest",
    );
  });
});
