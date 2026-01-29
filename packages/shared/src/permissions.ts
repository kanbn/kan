export const permissionActions = [
  "view",
  "create",
  "edit",
  "delete",
  "manage",
] as const;
export type PermissionAction = (typeof permissionActions)[number];

export const permissionResources = [
  "workspace",
  "board",
  "list",
  "card",
  "comment",
  "member",
] as const;
export type PermissionResource = (typeof permissionResources)[number];

export const allPermissions = [
  "workspace:view",
  "workspace:edit",
  "workspace:delete",
  "workspace:manage",
  "board:view",
  "board:create",
  "board:edit",
  "board:delete",
  "list:view",
  "list:create",
  "list:edit",
  "list:delete",
  "card:view",
  "card:create",
  "card:edit",
  "card:delete",
  "comment:view",
  "comment:create",
  "comment:edit",
  "comment:delete",
  "member:view",
  "member:invite",
  "member:edit",
  "member:remove",
] as const;

export type Permission = (typeof allPermissions)[number];

export const roleHierarchy = {
  admin: 100,
  member: 50,
  guest: 10,
} as const;

export type Role = keyof typeof roleHierarchy;
export const roles = Object.keys(roleHierarchy) as Role[];

export const defaultRolePermissions: Record<Role, readonly Permission[]> = {
  admin: allPermissions,
  member: [
    "workspace:view",
    "board:view",
    "board:create",
    "list:view",
    "list:create",
    "list:edit",
    "card:view",
    "card:create",
    "card:edit",
    "card:delete",
    "comment:view",
    "comment:create",
    "comment:edit",
    "comment:delete",
    "member:view",
  ],

  guest: [
    "workspace:view",
    "board:view",
    "list:view",
    "card:view",
    "comment:view",
    "member:view",
  ],
} as const;


export const permissionCategories = {
  workspace: {
    label: "Workspace",
    permissions: [
      "workspace:view",
      "workspace:edit",
      "workspace:delete",
      "workspace:manage",
    ] as const,
  },
  board: {
    label: "Boards",
    permissions: [
      "board:view",
      "board:create",
      "board:edit",
      "board:delete",
    ] as const,
  },
  list: {
    label: "Lists",
    permissions: [
      "list:view",
      "list:create",
      "list:edit",
      "list:delete",
    ] as const,
  },
  card: {
    label: "Cards",
    permissions: [
      "card:view",
      "card:create",
      "card:edit",
      "card:delete",
    ] as const,
  },
  comment: {
    label: "Comments",
    permissions: [
      "comment:view",
      "comment:create",
      "comment:edit",
      "comment:delete",
    ] as const,
  },
  member: {
    label: "Members",
    permissions: [
      "member:view",
      "member:invite",
      "member:edit",
      "member:remove",
    ] as const,
  },
} as const;

export function getDefaultPermissions(role: Role): readonly Permission[] {
  return defaultRolePermissions[role];
}

export function getRoleLevel(role: Role): number {
  return roleHierarchy[role];
}

export function canManageRole(managerRole: Role, targetRole: Role): boolean {
  return roleHierarchy[managerRole] >= roleHierarchy[targetRole];
}

export function hasPermissionInDefaults(
  role: Role,
  permission: Permission,
): boolean {
  return defaultRolePermissions[role].includes(permission);
}

