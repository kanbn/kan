import { TRPCError } from "@trpc/server";
import { env } from "next-runtime-env";
import { z } from "zod";

import * as inviteLinkRepo from "@kan/db/repository/inviteLink.repo";
import * as memberRepo from "@kan/db/repository/member.repo";
import * as permissionRepo from "@kan/db/repository/permission.repo";
import * as subscriptionRepo from "@kan/db/repository/subscription.repo";
import * as userRepo from "@kan/db/repository/user.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import {
  generateUID,
  getSubscriptionByPlan,
  hasUnlimitedSeats,
} from "@kan/shared";
import { updateSubscriptionSeats } from "@kan/stripe";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { assertUserInWorkspace } from "../utils/auth";
import {
  assertCanManageMember,
  assertCanManageRole,
  assertPermission,
} from "../utils/permissions";

export const memberRouter = createTRPCRouter({
  invite: protectedProcedure
    .meta({
      openapi: {
        summary: "Invite a member to a workspace",
        method: "POST",
        path: "/workspaces/{workspacePublicId}/members/invite",
        description: "Invites a member to a workspace",
        tags: ["Workspaces"],
        protect: true,
      },
    })
    .input(
      z.object({
        email: z.string().email(),
        workspacePublicId: z.string().min(12),
      }),
    )
    .output(z.custom<Awaited<ReturnType<typeof memberRepo.create>>>())
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const workspace = await workspaceRepo.getByPublicIdWithMembers(
        ctx.db,
        input.workspacePublicId,
      );

      if (!workspace)
        throw new TRPCError({
          message: `Workspace with public ID ${input.workspacePublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertUserInWorkspace(ctx.db, userId, workspace.id, "admin");

      const isInvitedEmailAlreadyMember = workspace.members.some(
        (member) => member.email === input.email,
      );

      if (isInvitedEmailAlreadyMember) {
        throw new TRPCError({
          message: `User with email ${input.email} is already a member of this workspace`,
          code: "CONFLICT",
        });
      }

      if (process.env.NEXT_PUBLIC_KAN_ENV === "cloud") {
        const subscriptions = await subscriptionRepo.getByReferenceId(
          ctx.db,
          workspace.publicId,
        );

        // get the active subscriptions
        const activeTeamSubscription = getSubscriptionByPlan(
          subscriptions,
          "team",
        );
        const activeProSubscription = getSubscriptionByPlan(
          subscriptions,
          "pro",
        );
        const unlimitedSeats = hasUnlimitedSeats(subscriptions);

        if (!activeTeamSubscription && !activeProSubscription) {
          throw new TRPCError({
            message: `Workspace with public ID ${workspace.publicId} does not have an active subscription`,
            code: "NOT_FOUND",
          });
        }

        // Update the Stripe subscription
        if (activeTeamSubscription?.stripeSubscriptionId && !unlimitedSeats) {
          try {
            await updateSubscriptionSeats(
              activeTeamSubscription.stripeSubscriptionId,
              1,
            );
          } catch (error) {
            console.error("Failed to update Stripe subscription seats:", error);
            throw new TRPCError({
              message: `Failed to update subscription for the new member.`,
              code: "INTERNAL_SERVER_ERROR",
            });
          }
        }
      }

      const existingUser = await userRepo.getByEmail(ctx.db, input.email);

      const invite = await memberRepo.create(ctx.db, {
        workspaceId: workspace.id,
        email: input.email,
        userId: existingUser?.id ?? null,
        createdBy: userId,
        role: "member",
        status: "invited",
      });

      if (!invite)
        throw new TRPCError({
          message: `Unable to invite user with email ${input.email}`,
          code: "INTERNAL_SERVER_ERROR",
        });

      const { status } = await ctx.auth.api.signInMagicLink({
        email: input.email,
        callbackURL: `/boards?type=invite&memberPublicId=${invite.publicId}`,
      });

      if (!status) {
        console.error("Failed to send magic link invitation:", {
          email: input.email,
          callbackURL: `/boards?type=invite&memberPublicId=${invite.publicId}`,
        });

        await memberRepo.softDelete(ctx.db, {
          memberId: invite.id,
          deletedAt: new Date(),
          deletedBy: userId,
        });

        throw new TRPCError({
          message: `Failed to send magic link invitation to user with email ${input.email}.`,
          code: "INTERNAL_SERVER_ERROR",
        });
      }

      return invite;
    }),
  delete: protectedProcedure
    .meta({
      openapi: {
        summary: "Delete a member from a workspace",
        method: "DELETE",
        path: "/workspaces/{workspacePublicId}/members/{memberPublicId}",
        description: "Deletes a member from a workspace",
        tags: ["Workspaces"],
        protect: true,
      },
    })
    .input(
      z.object({
        workspacePublicId: z.string().min(12),
        memberPublicId: z.string().min(12),
      }),
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const workspace = await workspaceRepo.getByPublicId(
        ctx.db,
        input.workspacePublicId,
      );

      if (!workspace)
        throw new TRPCError({
          message: `Workspace with public ID ${input.workspacePublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertUserInWorkspace(ctx.db, userId, workspace.id, "admin");

      const member = await memberRepo.getByPublicId(
        ctx.db,
        input.memberPublicId,
      );

      if (!member)
        throw new TRPCError({
          message: `Member with public ID ${input.memberPublicId} not found`,
          code: "NOT_FOUND",
        });

      const deletedMember = await memberRepo.softDelete(ctx.db, {
        memberId: member.id,
        deletedAt: new Date(),
        deletedBy: userId,
      });

      if (!deletedMember)
        throw new TRPCError({
          message: `Failed to delete member with public ID ${input.memberPublicId}`,
          code: "INTERNAL_SERVER_ERROR",
        });

      // Handle subscription seat decrement for cloud environment
      if (process.env.NEXT_PUBLIC_KAN_ENV === "cloud") {
        const subscriptions = await subscriptionRepo.getByReferenceId(
          ctx.db,
          workspace.publicId,
        );

        // get the active subscriptions
        const activeTeamSubscription = getSubscriptionByPlan(
          subscriptions,
          "team",
        );
        const unlimitedSeats = hasUnlimitedSeats(subscriptions);

        // Only decrease seats if there's an active subscription and stripeSubscriptionId
        if (activeTeamSubscription?.stripeSubscriptionId && !unlimitedSeats) {
          try {
            await updateSubscriptionSeats(
              activeTeamSubscription.stripeSubscriptionId,
              -1,
            );
          } catch (error) {
            console.error(
              "Failed to decrease Stripe subscription seats:",
              error,
            );
          }
        }
      }

      return { success: true };
    }),
  getActiveInviteLink: protectedProcedure
    .meta({
      openapi: {
        summary: "Get active invite link for workspace",
        method: "GET",
        path: "/workspaces/{workspacePublicId}/invite",
        description: "Gets the active invite link for a workspace",
        tags: ["Invites"],
        protect: true,
      },
    })
    .input(
      z.object({
        workspacePublicId: z.string().min(12),
      }),
    )
    .output(
      z.object({
        id: z.number().optional(),
        inviteCode: z.string().optional(),
        inviteLink: z.string().optional(),
        isActive: z.boolean(),
        expiresAt: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const workspace = await workspaceRepo.getByPublicId(
        ctx.db,
        input.workspacePublicId,
      );

      if (!workspace)
        throw new TRPCError({
          message: `Workspace not found`,
          code: "NOT_FOUND",
        });

      // Check if user is in workspace
      await assertUserInWorkspace(ctx.db, userId, workspace.id);

      // Get active invite link for this workspace
      const activeInviteLink = await inviteLinkRepo.getActiveForWorkspace(
        ctx.db,
        workspace.id,
      );

      if (
        activeInviteLink &&
        (!activeInviteLink.expiresAt || new Date() < activeInviteLink.expiresAt)
      ) {
        return {
          id: activeInviteLink.id,
          inviteCode: activeInviteLink.code,
          inviteLink: `${env("NEXT_PUBLIC_BASE_URL")}/invite/${activeInviteLink.code}`,
          isActive: true,
          expiresAt: activeInviteLink.expiresAt ?? undefined,
        };
      }

      return { isActive: false };
    }),
  createInviteLink: protectedProcedure
    .meta({
      openapi: {
        summary: "Create invite link for workspace",
        method: "POST",
        path: "/workspaces/{workspacePublicId}/invites",
        description: "Create invite link for a workspace",
        tags: ["Invites"],
        protect: true,
      },
    })
    .input(
      z.object({
        workspacePublicId: z.string().min(12),
      }),
    )
    .output(
      z.object({
        publicId: z.string().min(12),
        inviteCode: z.string(),
        inviteLink: z.string(),
        expiresAt: z.date().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const workspace = await workspaceRepo.getByPublicId(
        ctx.db,
        input.workspacePublicId,
      );

      if (!workspace)
        throw new TRPCError({
          message: `Workspace not found`,
          code: "NOT_FOUND",
        });

      // Check if user is in workspace
      await assertUserInWorkspace(ctx.db, userId, workspace.id, "admin");

      // Check subscription for cloud environment
      if (process.env.NEXT_PUBLIC_KAN_ENV === "cloud") {
        const subscriptions = await subscriptionRepo.getByReferenceId(
          ctx.db,
          workspace.publicId,
        );

        const activeTeamSubscription = getSubscriptionByPlan(
          subscriptions,
          "team",
        );
        const activeProSubscription = getSubscriptionByPlan(
          subscriptions,
          "pro",
        );

        if (!activeTeamSubscription && !activeProSubscription) {
          throw new TRPCError({
            message: `Invite links require a Team or Pro subscription`,
            code: "FORBIDDEN",
          });
        }
      }

      // Deactivate any existing active invite links
      await inviteLinkRepo.deactivateAllActiveForWorkspace(ctx.db, {
        workspaceId: workspace.id,
        updatedBy: userId,
      });

      // Generate new invite code
      const inviteCode = generateUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Create new invite link
      const inviteLink = await inviteLinkRepo.createInviteLink(ctx.db, {
        workspaceId: workspace.id,
        code: inviteCode,
        expiresAt,
        createdBy: userId,
      });

      if (!inviteLink) {
        throw new TRPCError({
          message: `Failed to create invite link`,
          code: "INTERNAL_SERVER_ERROR",
        });
      }

      return {
        publicId: inviteLink.publicId,
        inviteCode: inviteLink.code,
        inviteLink: `${env("NEXT_PUBLIC_BASE_URL")}/invite/${inviteLink.code}`,
        expiresAt: inviteLink.expiresAt,
      };
    }),
  deactivateInviteLink: protectedProcedure
    .meta({
      openapi: {
        summary: "Deactivate invite link for workspace",
        method: "DELETE",
        path: "/workspaces/{workspacePublicId}/invites",
        description: "Deactivates the invite link for a workspace",
        tags: ["Invites"],
        protect: true,
      },
    })
    .input(
      z.object({
        workspacePublicId: z.string().min(12),
      }),
    )
    .output(
      z.object({
        success: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const workspace = await workspaceRepo.getByPublicId(
        ctx.db,
        input.workspacePublicId,
      );

      if (!workspace)
        throw new TRPCError({
          message: `Workspace not found`,
          code: "NOT_FOUND",
        });

      // Check if user is in workspace
      await assertUserInWorkspace(ctx.db, userId, workspace.id, "admin");

      // Deactivate all active invite links
      await inviteLinkRepo.deactivateAllActiveForWorkspace(ctx.db, {
        workspaceId: workspace.id,
        updatedBy: userId,
      });

      return { success: true };
    }),
  getInviteByCode: publicProcedure
    .meta({
      openapi: {
        summary: "Get invite information by code",
        method: "GET",
        path: "/invites/{inviteCode}",
        description: "Get invite information by invite code",
        tags: ["Invites"],
        protect: false,
      },
    })
    .input(
      z.object({
        inviteCode: z.string().min(12),
      }),
    )
    .output(
      z
        .object({
          publicId: z.string().min(12),
          status: z.string(),
          expiresAt: z.date().nullable(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const invite = await inviteLinkRepo.getByCode(ctx.db, input.inviteCode);

      if (
        !invite ||
        invite.status !== "active" ||
        (invite.expiresAt && new Date() > invite.expiresAt)
      ) {
        throw new TRPCError({
          message: `Invalid or expired invite link`,
          code: "BAD_REQUEST",
        });
      }

      return {
        publicId: invite.publicId,
        status: invite.status,
        expiresAt: invite.expiresAt ?? null,
      };
    }),
  acceptInviteLink: publicProcedure
    .meta({
      openapi: {
        summary: "Accept an invite link",
        method: "POST",
        path: "/invites/accept",
        description: "Accepts an invitation via invite link",
        tags: ["Invites"],
        protect: false,
      },
    })
    .input(
      z.object({
        inviteCode: z.string().min(12),
      }),
    )
    .output(
      z.object({
        success: z.boolean(),
        workspacePublicId: z.string().optional(),
        workspaceSlug: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const invite = await inviteLinkRepo.getByCode(ctx.db, input.inviteCode);

      if (
        !invite ||
        invite.status !== "active" ||
        (invite.expiresAt && new Date() > invite.expiresAt)
      )
        throw new TRPCError({
          message: `Invalid or expired invite link`,
          code: "BAD_REQUEST",
        });

      const workspace = await workspaceRepo.getById(ctx.db, invite.workspaceId);

      if (!workspace)
        throw new TRPCError({
          message: `Workspace not found`,
          code: "NOT_FOUND",
        });

      const isMember = await workspaceRepo.isUserInWorkspace(
        ctx.db,
        userId,
        invite.workspaceId,
      );

      if (isMember) {
        throw new TRPCError({
          message: `User is already a member of this workspace`,
          code: "CONFLICT",
        });
      }

      const user = await userRepo.getById(ctx.db, userId);

      if (!user)
        throw new TRPCError({
          message: `User not found`,
          code: "NOT_FOUND",
        });

      if (process.env.NEXT_PUBLIC_KAN_ENV === "cloud") {
        const subscriptions = await subscriptionRepo.getByReferenceId(
          ctx.db,
          workspace.publicId,
        );

        // get the active subscriptions
        const activeTeamSubscription = getSubscriptionByPlan(
          subscriptions,
          "team",
        );
        const activeProSubscription = getSubscriptionByPlan(
          subscriptions,
          "pro",
        );
        const unlimitedSeats = hasUnlimitedSeats(subscriptions);

        if (!activeTeamSubscription && !activeProSubscription) {
          throw new TRPCError({
            message: `Workspace with public ID ${workspace.publicId} does not have an active subscription`,
            code: "NOT_FOUND",
          });
        }

        // Update the Stripe subscription
        if (activeTeamSubscription?.stripeSubscriptionId && !unlimitedSeats) {
          try {
            await updateSubscriptionSeats(
              activeTeamSubscription.stripeSubscriptionId,
              1,
            );
          } catch (error) {
            console.error("Failed to update Stripe subscription seats:", error);
            throw new TRPCError({
              message: `Failed to update subscription for the new member.`,
              code: "INTERNAL_SERVER_ERROR",
            });
          }
        }
      }

      await memberRepo.create(ctx.db, {
        workspaceId: invite.workspaceId,
        email: user.email,
        userId: user.id,
        createdBy: user.id,
        role: "member",
        status: "active",
      });

      return {
        success: true,
        workspacePublicId: workspace.publicId,
        workspaceSlug: workspace.slug,
      };
    }),
  updateRole: protectedProcedure
    .meta({
      openapi: {
        summary: "Update member role",
        method: "PUT",
        path: "/workspaces/{workspacePublicId}/members/{memberPublicId}/role",
        description: "Updates a member's role in a workspace",
        tags: ["Workspaces"],
        protect: true,
      },
    })
    .input(
      z.object({
        workspacePublicId: z.string().min(12),
        memberPublicId: z.string().min(12),
        role: z.enum(["admin", "member", "guest"]),
      }),
    )
    .output(
      z.object({
        success: z.boolean(),
        role: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId) {
        throw new TRPCError({
          message: "User not authenticated",
          code: "UNAUTHORIZED",
        });
      }

      const workspace = await workspaceRepo.getByPublicId(
        ctx.db,
        input.workspacePublicId,
      );

      if (!workspace) {
        throw new TRPCError({
          message: "Workspace not found",
          code: "NOT_FOUND",
        });
      }

      await assertPermission(ctx.db, userId, workspace.id, "member:edit");

      const member = await memberRepo.getByPublicId(
        ctx.db,
        input.memberPublicId,
      );

      if (!member) {
        throw new TRPCError({
          message: "Member not found",
          code: "NOT_FOUND",
        });
      }

      await assertCanManageMember(ctx.db, userId, workspace.id, member.id);
      await assertCanManageRole(ctx.db, userId, workspace.id, input.role);

      // Get the workspace role to set roleId
      const workspaceRole = await permissionRepo.getRoleByWorkspaceIdAndName(
        ctx.db,
        workspace.id,
        input.role,
      );

      await memberRepo.updateRole(ctx.db, {
        memberId: member.id,
        role: input.role,
        roleId: workspaceRole?.id ?? null,
      });

      return {
        success: true,
        role: input.role,
      };
    }),
});
