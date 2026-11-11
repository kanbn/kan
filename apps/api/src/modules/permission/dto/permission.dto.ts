import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { allPermissions } from "@kan/shared";

export const PermissionSchema = z.enum(allPermissions);

export const GetMyPermissionsResponseSchema = z.object({
  permissions: z.array(z.string()),
  role: z.string(),
});

export class GetMyPermissionsResponseDto extends createZodDto(
  GetMyPermissionsResponseSchema,
) {}

export const GetMemberPermissionsResponseSchema = z.object({
  memberPublicId: z.string(),
  role: z.string(),
  permissions: z.array(z.string()),
  overrides: z.array(
    z.object({
      permission: z.string(),
      granted: z.boolean(),
    }),
  ),
});

export class GetMemberPermissionsResponseDto extends createZodDto(
  GetMemberPermissionsResponseSchema,
) {}

export const PermissionActionSchema = z.object({
  permission: PermissionSchema,
});

export class PermissionActionDto extends createZodDto(PermissionActionSchema) {}

export const SuccessResponseSchema = z.object({ success: z.boolean() });

export class SuccessResponseDto extends createZodDto(SuccessResponseSchema) {}

export const GetWorkspaceRolesResponseSchema = z.object({
  roles: z.array(
    z.object({
      publicId: z.string().min(12),
      name: z.string(),
      description: z.string().nullable(),
      hierarchyLevel: z.number(),
      isSystem: z.boolean(),
    }),
  ),
});

export class GetWorkspaceRolesResponseDto extends createZodDto(
  GetWorkspaceRolesResponseSchema,
) {}

export const GetWorkspaceRolePermissionsResponseSchema = z.object({
  roles: z.array(
    z.object({
      publicId: z.string().min(12),
      name: z.string(),
      permissions: z.array(z.string()),
    }),
  ),
});

export class GetWorkspaceRolePermissionsResponseDto extends createZodDto(
  GetWorkspaceRolePermissionsResponseSchema,
) {}

export const GetRolePermissionsResponseSchema = z.object({
  rolePublicId: z.string(),
  name: z.string(),
  permissions: z.array(z.string()),
});

export class GetRolePermissionsResponseDto extends createZodDto(
  GetRolePermissionsResponseSchema,
) {}
