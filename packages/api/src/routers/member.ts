import { TRPCError } from "@trpc/server";
import { z } from "zod";

import * as memberRepo from "@kan/db/repository/member.repo";
import * as userRepo from "@kan/db/repository/user.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { assertUserInWorkspace } from "../utils/auth";

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

      if (process.env.NEXT_PUBLIC_KAN_ENV === "cloud") {
        const subscriptions = await ctx.auth.api.listActiveSubscriptions({
          userId,
        });

        // get the active subscription
        const activeSubscription = subscriptions.find(
          (sub) => sub.status === "active" || sub.status === "trialing",
        );

        // @todo: update the subscription with the new seat
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

      return { success: true };
    }),
});
