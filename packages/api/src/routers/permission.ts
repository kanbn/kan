import { TRPCError } from "@trpc/server";
import { z } from "zod";

import * as memberRepo from "@kan/db/repository/member.repo";
import * as permissionRepo from "@kan/db/repository/permission.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import type { Permission } from "@kan/shared";
import {
  allPermissions,
} from "@kan/shared";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  assertCanManageMember,
  assertPermission,
  getMemberEffectivePermissions,
  getUserPermissions,
} from "../utils/permissions";

const permissionsList = [...allPermissions] as [string, ...string[]];

export const permissionRouter = createTRPCRouter({
  getMyPermissions: protectedProcedure
    .meta({
      openapi: {
        summary: "Get my permissions",
        method: "GET",
        path: "/workspaces/{workspacePublicId}/permissions/me",
        description: "Get the current user's permissions in a workspace",
        tags: ["Permissions"],
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
        permissions: z.array(z.string()),
        role: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
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

      const result = await getUserPermissions(ctx.db, userId, workspace.id);

      if (!result) {
        throw new TRPCError({
          message: "You are not a member of this workspace",
          code: "FORBIDDEN",
        });
      }

      return result;
    }),
  getMemberPermissions: protectedProcedure
    .meta({
      openapi: {
        summary: "Get member permissions",
        method: "GET",
        path: "/workspaces/{workspacePublicId}/members/{memberPublicId}/permissions",
        description: "Get a specific member's permissions in a workspace",
        tags: ["Permissions"],
        protect: true,
      },
    })
    .input(
      z.object({
        workspacePublicId: z.string().min(12),
        memberPublicId: z.string().min(12),
      }),
    )
    .output(
      z.object({
        memberPublicId: z.string(),
        role: z.string(),
        permissions: z.array(z.string()),
        overrides: z.array(
          z.object({
            permission: z.string(),
            granted: z.boolean(),
          }),
        ),
      }),
    )
    .query(async ({ ctx, input }) => {
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

      // Check user has permission to view member permissions
      await assertPermission(ctx.db, userId, workspace.id, "member:view");

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

      const effectivePermissions = await getMemberEffectivePermissions(
        ctx.db,
        member.id,
        member.roleId ?? null,
        member.role,
      );
      const overrides = await permissionRepo.getMemberPermissionOverrides(
        ctx.db,
        member.id,
      );

      return {
        memberPublicId: member.publicId,
        role: member.role,
        permissions: effectivePermissions,
        overrides: overrides.map((o) => ({
          permission: o.permission,
          granted: o.granted,
        })),
      };
    }),
  grantPermission: protectedProcedure
    .meta({
      openapi: {
        summary: "Grant permission to member",
        method: "POST",
        path: "/workspaces/{workspacePublicId}/members/{memberPublicId}/permissions/grant",
        description: "Grant a specific permission to a member",
        tags: ["Permissions"],
        protect: true,
      },
    })
    .input(
      z.object({
        workspacePublicId: z.string().min(12),
        memberPublicId: z.string().min(12),
        permission: z.enum(permissionsList),
      }),
    )
    .output(z.object({ success: z.boolean() }))
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

      await permissionRepo.grantPermission(
        ctx.db,
        member.id,
        input.permission as Permission,
      );

      return { success: true };
    }),
  revokePermission: protectedProcedure
    .meta({
      openapi: {
        summary: "Revoke permission from member",
        method: "POST",
        path: "/workspaces/{workspacePublicId}/members/{memberPublicId}/permissions/revoke",
        description: "Revoke a specific permission from a member",
        tags: ["Permissions"],
        protect: true,
      },
    })
    .input(
      z.object({
        workspacePublicId: z.string().min(12),
        memberPublicId: z.string().min(12),
        permission: z.enum(permissionsList),
      }),
    )
    .output(z.object({ success: z.boolean() }))
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

      await permissionRepo.revokePermission(
        ctx.db,
        member.id,
        input.permission as Permission,
      );

      return { success: true };
    }),
});
