import { z } from "zod";

const publicId = (entity: string, source: string) =>
  z
    .string()
    .min(12)
    .describe(
      `The ${entity}'s 12-character public ID (not its name). ${source}`,
    );

export const workspacePublicId = publicId(
  "workspace",
  "Get it from list_workspaces or find_workspace_by_name.",
);
export const boardPublicId = publicId(
  "board",
  "Get it from list_boards or find_board_by_name.",
);
export const listPublicId = publicId("list", "Get it from get_board.");
export const cardPublicId = publicId(
  "card",
  "Get it from get_board or search_workspace.",
);
export const labelPublicId = publicId("label", "Get it from get_board.");
export const checklistPublicId = publicId("checklist", "Get it from get_card.");
export const checklistItemPublicId = publicId(
  "checklist item",
  "Get it from get_card.",
);
export const commentPublicId = publicId(
  "comment",
  "Get it from get_card or get_card_activities.",
);
export const attachmentPublicId = publicId(
  "attachment",
  "Get it from get_card.",
);
export const webhookPublicId = publicId(
  "webhook",
  "Get it from list_webhooks.",
);
export const rolePublicId = publicId(
  "role",
  "Get it from get_workspace_roles.",
);
export const memberPublicId = publicId(
  "workspace member (not the user ID)",
  "Get it from get_workspace.",
);
export const workspaceMemberPublicId = memberPublicId;
export const workspaceSlug = z
  .string()
  .min(1)
  .describe("The workspace's URL slug, e.g. 'acme' in kan.bn/acme.");
