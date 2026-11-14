import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";

import * as inviteLinkRepo from "@kan/db/repository/inviteLink.repo";
import * as memberRepo from "@kan/db/repository/member.repo";
import * as permissionRepo from "@kan/db/repository/permission.repo";
import * as subscriptionRepo from "@kan/db/repository/subscription.repo";
import * as userRepo from "@kan/db/repository/user.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { createLogger } from "@kan/logger";
import {
  assertCanManageMember,
  assertCanManageRole,
  assertPermission,
} from "@kan/server/utils/permissions";
import {
  generateUID,
  getSeatLimit,
  getSubscriptionByPlan,
  hasUnlimitedSeats,
} from "@kan/shared/utils";
import { updateSubscriptionSeats } from "@kan/stripe";

import { assertFound } from "../../common/assert-found.util.js";
import { db, sendMagicLinkInvite } from "../../common/session.util.js";

const log = createLogger("member");

const isCloudEnv = () => process.env.NEXT_PUBLIC_KAN_ENV === "cloud";

@Injectable()
export class MemberService {
  async invite(input: {
    workspacePublicId: string;
    email: string;
    userId: string;
    headers: Headers;
  }) {
    const workspace = await assertFound(
      workspaceRepo.getByPublicIdWithMembers(db, input.workspacePublicId),
      `Workspace with public ID ${input.workspacePublicId} not found`,
    );

    await assertPermission(db, input.userId, workspace.id, "member:invite");

    const isInvitedEmailAlreadyMember = workspace.members.some(
      (member) => member.email === input.email,
    );

    if (isInvitedEmailAlreadyMember)
      throw new ConflictException(
        `User with email ${input.email} is already a member of this workspace`,
      );

    if (isCloudEnv()) {
      const subscriptions = await subscriptionRepo.getByReferenceId(
        db,
        workspace.publicId,
      );

      const activeTeamSubscription = getSubscriptionByPlan(
        subscriptions,
        "team",
      );
      const activeProSubscription = getSubscriptionByPlan(subscriptions, "pro");
      const unlimitedSeats = hasUnlimitedSeats(subscriptions);

      if (!activeTeamSubscription && !activeProSubscription)
        throw new NotFoundException(
          `Workspace with public ID ${workspace.publicId} does not have an active subscription`,
        );

      if (activeTeamSubscription?.stripeSubscriptionId && !unlimitedSeats) {
        try {
          const updatedSubscription = await updateSubscriptionSeats(
            activeTeamSubscription.stripeSubscriptionId,
            1,
          );
          log.info(
            {
              workspacePublicId: workspace.publicId,
              stripeSubscriptionId: activeTeamSubscription.stripeSubscriptionId,
              newQuantity: updatedSubscription.items.data[0]?.quantity,
            },
            "Incremented Stripe subscription seats for invited member",
          );
        } catch (error) {
          log.error(
            {
              err: error,
              workspacePublicId: workspace.publicId,
              stripeSubscriptionId: activeTeamSubscription.stripeSubscriptionId,
            },
            "Failed to increment Stripe subscription seats",
          );
          throw new InternalServerErrorException(
            `Failed to update subscription for the new member.`,
          );
        }
      } else if (activeTeamSubscription) {
        log.warn(
          {
            workspacePublicId: workspace.publicId,
            hasStripeSubscriptionId:
              !!activeTeamSubscription.stripeSubscriptionId,
            unlimitedSeats,
          },
          "Skipped Stripe seat increment for invited member",
        );
      }

      const seatLimit = getSeatLimit(subscriptions);
      if (seatLimit !== null) {
        const memberCount = await memberRepo.getCountByWorkspaceId(
          db,
          workspace.id,
        );
        if (memberCount >= seatLimit)
          throw new ForbiddenException(`SEAT_LIMIT_REACHED`);
      }
    }

    const existingUser = await userRepo.getByEmail(db, input.email);

    const memberRole = await permissionRepo.getRoleByWorkspaceIdAndName(
      db,
      workspace.id,
      "member",
    );

    const invite = await memberRepo.create(db, {
      workspaceId: workspace.id,
      email: input.email,
      userId: existingUser?.id ?? null,
      createdBy: input.userId,
      role: "member",
      roleId: memberRole?.id ?? null,
      status: "invited",
    });

    if (!invite)
      throw new InternalServerErrorException(
        `Unable to invite user with email ${input.email}`,
      );

    const { status } = await sendMagicLinkInvite(input.headers, {
      email: input.email,
      callbackURL: `/boards?type=invite&memberPublicId=${invite.publicId}`,
    });

    if (!status) {
      log.error(
        { email: input.email, memberPublicId: invite.publicId },
        "Failed to send magic link invitation",
      );

      await memberRepo.softDelete(db, {
        memberId: invite.id,
        deletedAt: new Date(),
        deletedBy: input.userId,
      });

      throw new InternalServerErrorException(
        `Failed to send magic link invitation to user with email ${input.email}.`,
      );
    }

    return invite;
  }

  async delete(input: {
    workspacePublicId: string;
    memberPublicId: string;
    userId: string;
  }) {
    const workspace = await assertFound(
      workspaceRepo.getByPublicId(db, input.workspacePublicId),
      `Workspace with public ID ${input.workspacePublicId} not found`,
    );

    await assertPermission(db, input.userId, workspace.id, "member:remove");

    const member = await memberRepo.getByPublicId(db, input.memberPublicId);

    if (member?.workspaceId !== workspace.id)
      throw new NotFoundException(
        `Member with public ID ${input.memberPublicId} not found`,
      );

    const deletedMember = await memberRepo.softDelete(db, {
      memberId: member.id,
      deletedAt: new Date(),
      deletedBy: input.userId,
    });

    if (!deletedMember)
      throw new InternalServerErrorException(
        `Failed to delete member with public ID ${input.memberPublicId}`,
      );

    if (isCloudEnv()) {
      const subscriptions = await subscriptionRepo.getByReferenceId(
        db,
        workspace.publicId,
      );

      const activeTeamSubscription = getSubscriptionByPlan(
        subscriptions,
        "team",
      );
      const unlimitedSeats = hasUnlimitedSeats(subscriptions);

      if (activeTeamSubscription?.stripeSubscriptionId && !unlimitedSeats) {
        try {
          const updatedSubscription = await updateSubscriptionSeats(
            activeTeamSubscription.stripeSubscriptionId,
            -1,
          );
          log.info(
            {
              workspacePublicId: workspace.publicId,
              stripeSubscriptionId: activeTeamSubscription.stripeSubscriptionId,
              newQuantity: updatedSubscription.items.data[0]?.quantity,
            },
            "Decremented Stripe subscription seats for removed member",
          );
        } catch (error) {
          log.error(
            {
              err: error,
              workspacePublicId: workspace.publicId,
              stripeSubscriptionId: activeTeamSubscription.stripeSubscriptionId,
            },
            "Failed to decrease Stripe subscription seats",
          );
        }
      } else if (activeTeamSubscription) {
        log.warn(
          {
            workspacePublicId: workspace.publicId,
            hasStripeSubscriptionId:
              !!activeTeamSubscription.stripeSubscriptionId,
            unlimitedSeats,
          },
          "Skipped Stripe seat decrement for removed member",
        );
      }
    }

    return { success: true };
  }

  async getActiveInviteLink(input: {
    workspacePublicId: string;
    userId: string;
  }) {
    const workspace = await assertFound(
      workspaceRepo.getByPublicId(db, input.workspacePublicId),
      `Workspace not found`,
    );

    await assertPermission(db, input.userId, workspace.id, "member:view");

    const activeInviteLink = await inviteLinkRepo.getActiveForWorkspace(
      db,
      workspace.id,
    );

    if (
      activeInviteLink &&
      (!activeInviteLink.expiresAt || new Date() < activeInviteLink.expiresAt)
    ) {
      return {
        id: activeInviteLink.id,
        inviteCode: activeInviteLink.code,
        inviteLink: `${process.env.NEXT_PUBLIC_BASE_URL}/invite/${activeInviteLink.code}`,
        isActive: true,
        expiresAt: activeInviteLink.expiresAt?.toISOString(),
      };
    }

    return { isActive: false };
  }

  async createInviteLink(input: { workspacePublicId: string; userId: string }) {
    const workspace = await assertFound(
      workspaceRepo.getByPublicId(db, input.workspacePublicId),
      `Workspace not found`,
    );

    await assertPermission(db, input.userId, workspace.id, "member:edit");

    if (isCloudEnv()) {
      const subscriptions = await subscriptionRepo.getByReferenceId(
        db,
        workspace.publicId,
      );

      const activeTeamSubscription = getSubscriptionByPlan(
        subscriptions,
        "team",
      );
      const activeProSubscription = getSubscriptionByPlan(subscriptions, "pro");

      if (!activeTeamSubscription && !activeProSubscription)
        throw new ForbiddenException(
          `Invite links require a Team or Pro subscription`,
        );
    }

    await inviteLinkRepo.deactivateAllActiveForWorkspace(db, {
      workspaceId: workspace.id,
      updatedBy: input.userId,
    });

    const inviteCode = generateUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const inviteLink = await inviteLinkRepo.createInviteLink(db, {
      workspaceId: workspace.id,
      code: inviteCode,
      expiresAt,
      createdBy: input.userId,
    });

    if (!inviteLink)
      throw new InternalServerErrorException(`Failed to create invite link`);

    return {
      publicId: inviteLink.publicId,
      inviteCode: inviteLink.code,
      inviteLink: `${process.env.NEXT_PUBLIC_BASE_URL}/invite/${inviteLink.code}`,
      expiresAt: inviteLink.expiresAt?.toISOString() ?? null,
    };
  }

  async deactivateInviteLink(input: {
    workspacePublicId: string;
    userId: string;
  }) {
    const workspace = await assertFound(
      workspaceRepo.getByPublicId(db, input.workspacePublicId),
      `Workspace not found`,
    );

    await assertPermission(db, input.userId, workspace.id, "member:edit");

    await inviteLinkRepo.deactivateAllActiveForWorkspace(db, {
      workspaceId: workspace.id,
      updatedBy: input.userId,
    });

    return { success: true };
  }

  async getInviteByCode(input: { inviteCode: string }) {
    const invite = await inviteLinkRepo.getByCode(db, input.inviteCode);

    if (
      invite?.status !== "active" ||
      (invite.expiresAt && new Date() > invite.expiresAt)
    )
      throw new BadRequestException(`Invalid or expired invite link`);

    return {
      publicId: invite.publicId,
      status: invite.status,
      expiresAt: invite.expiresAt?.toISOString() ?? null,
    };
  }

  async acceptInviteLink(input: { inviteCode: string; userId: string }) {
    const invite = await inviteLinkRepo.getByCode(db, input.inviteCode);

    if (
      invite?.status !== "active" ||
      (invite.expiresAt && new Date() > invite.expiresAt)
    )
      throw new BadRequestException(`Invalid or expired invite link`);

    const workspace = await assertFound(
      workspaceRepo.getById(db, invite.workspaceId),
      `Workspace not found`,
    );

    const isMember = await workspaceRepo.isUserInWorkspace(
      db,
      input.userId,
      invite.workspaceId,
    );

    if (isMember)
      throw new ConflictException(`User is already a member of this workspace`);

    const user = await assertFound(
      userRepo.getById(db, input.userId),
      `User not found`,
    );

    if (isCloudEnv()) {
      const subscriptions = await subscriptionRepo.getByReferenceId(
        db,
        workspace.publicId,
      );

      const activeTeamSubscription = getSubscriptionByPlan(
        subscriptions,
        "team",
      );
      const activeProSubscription = getSubscriptionByPlan(subscriptions, "pro");
      const unlimitedSeats = hasUnlimitedSeats(subscriptions);

      if (!activeTeamSubscription && !activeProSubscription)
        throw new NotFoundException(
          `Workspace with public ID ${workspace.publicId} does not have an active subscription`,
        );

      if (activeTeamSubscription?.stripeSubscriptionId && !unlimitedSeats) {
        try {
          const updatedSubscription = await updateSubscriptionSeats(
            activeTeamSubscription.stripeSubscriptionId,
            1,
          );
          log.info(
            {
              workspacePublicId: workspace.publicId,
              stripeSubscriptionId: activeTeamSubscription.stripeSubscriptionId,
              newQuantity: updatedSubscription.items.data[0]?.quantity,
            },
            "Incremented Stripe subscription seats for invite link acceptance",
          );
        } catch (error) {
          log.error(
            {
              err: error,
              workspacePublicId: workspace.publicId,
              stripeSubscriptionId: activeTeamSubscription.stripeSubscriptionId,
            },
            "Failed to increment Stripe subscription seats",
          );
          throw new InternalServerErrorException(
            `Failed to update subscription for the new member.`,
          );
        }
      } else if (activeTeamSubscription) {
        log.warn(
          {
            workspacePublicId: workspace.publicId,
            hasStripeSubscriptionId:
              !!activeTeamSubscription.stripeSubscriptionId,
            unlimitedSeats,
          },
          "Skipped Stripe seat increment for invite link acceptance",
        );
      }

      const seatLimit = getSeatLimit(subscriptions);
      if (seatLimit !== null) {
        const memberCount = await memberRepo.getCountByWorkspaceId(
          db,
          workspace.id,
        );
        if (memberCount >= seatLimit)
          throw new ForbiddenException(`SEAT_LIMIT_REACHED`);
      }
    }

    const memberRole = await permissionRepo.getRoleByWorkspaceIdAndName(
      db,
      invite.workspaceId,
      "member",
    );

    await memberRepo.create(db, {
      workspaceId: invite.workspaceId,
      email: user.email,
      userId: user.id,
      createdBy: user.id,
      role: "member",
      roleId: memberRole?.id ?? null,
      status: "active",
    });

    return {
      success: true,
      workspacePublicId: workspace.publicId,
      workspaceSlug: workspace.slug,
    };
  }

  async updateRole(input: {
    workspacePublicId: string;
    memberPublicId: string;
    role: "admin" | "member" | "guest";
    userId: string;
  }) {
    const workspace = await assertFound(
      workspaceRepo.getByPublicId(db, input.workspacePublicId),
      `Workspace not found`,
    );

    await assertPermission(db, input.userId, workspace.id, "member:edit");

    const member = await memberRepo.getByPublicId(db, input.memberPublicId);

    if (member?.workspaceId !== workspace.id)
      throw new NotFoundException(`Member not found`);

    await assertCanManageMember(db, input.userId, workspace.id, member.id);
    await assertCanManageRole(db, input.userId, workspace.id, input.role);

    const workspaceRole = await permissionRepo.getRoleByWorkspaceIdAndName(
      db,
      workspace.id,
      input.role,
    );

    await memberRepo.updateRole(db, {
      memberId: member.id,
      role: input.role,
      roleId: workspaceRole?.id ?? null,
    });

    return {
      success: true,
      role: input.role,
    };
  }
}
