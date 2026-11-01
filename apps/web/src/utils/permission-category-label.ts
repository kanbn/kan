import { t } from "@lingui/core/macro";

import type { permissionCategories } from "@kan/shared";

export function permissionCategoryLabel(
  label: (typeof permissionCategories)[keyof typeof permissionCategories]["label"],
): string {
  switch (label) {
    case "Workspace":
      return t`Workspace`;
    case "Boards":
      return t`Boards`;
    case "Lists":
      return t`Lists`;
    case "Cards":
      return t`Cards`;
    case "Comments":
      return t`Comments`;
    case "Members":
      return t`Members`;
    default:
      return label;
  }
}
