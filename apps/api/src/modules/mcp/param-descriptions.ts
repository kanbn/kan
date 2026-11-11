const id = (entity: string, source: string) =>
  `The ${entity}'s 12-character public ID (not its name). ${source}`;

// Shared by every tool that takes a parameter of this name; a tool can
// override one through the `params` option of the MCP `Tool` decorator.
export const PARAM_DESCRIPTIONS: Record<string, string> = {
  workspacePublicId: id(
    "workspace",
    "Get it from list_workspaces or find_workspace_by_name.",
  ),
  targetWorkspacePublicId: id(
    "destination workspace",
    "Get it from list_workspaces or find_workspace_by_name.",
  ),
  boardPublicId: id("board", "Get it from list_boards or find_board_by_name."),
  sourceBoardPublicId: id(
    "board or template to copy lists and labels from",
    "Get it from list_boards.",
  ),
  listPublicId: id("list", "Get it from get_board."),
  cardPublicId: id("card", "Get it from get_board or search_workspace."),
  labelPublicId: id("label", "Get it from get_board."),
  labelPublicIds:
    "Public IDs of board labels to attach. Get them from get_board.",
  checklistPublicId: id("checklist", "Get it from get_card."),
  checklistItemPublicId: id("checklist item", "Get it from get_card."),
  commentPublicId: id(
    "comment",
    "Get it from get_card or get_card_activities.",
  ),
  attachmentPublicId: id("attachment", "Get it from get_card."),
  webhookPublicId: id("webhook", "Get it from list_webhooks."),
  rolePublicId: id("role", "Get it from get_workspace_roles."),
  memberPublicId: id(
    "workspace member (not the user ID)",
    "Get it from get_workspace.",
  ),
  workspaceMemberPublicId: id(
    "workspace member (not the user ID)",
    "Get it from get_workspace.",
  ),
  memberPublicIds:
    "Public IDs of workspace members (not user IDs) to assign. Get them from get_workspace.",
  workspaceSlug: "The workspace's URL slug, e.g. 'acme' in kan.bn/acme.",

  name: "Name.",
  title: "Title.",
  description: "Description, in markdown.",
  slug: "URL-friendly slug of letters, numbers and hyphens.",
  index:
    "Zero-based position within its parent; 0 is the top. Omit to keep the current position.",
  dueDate:
    "Due date in ISO 8601 (e.g. 2026-12-31T17:00:00Z), or null to clear it.",
  position: "Where to insert the card in the list: 'start' or 'end'.",
  comment: "Comment text, in markdown.",
  completed: "Whether the checklist item is done.",
  colourCode: "Label colour as a 7-character hex code, e.g. #0d9488.",
  copyLabels: "Copy the card's labels to the duplicate.",
  copyMembers: "Copy the card's assigned members to the duplicate.",
  copyChecklists: "Copy the card's checklists to the duplicate.",
  visibility:
    "'public' boards can be viewed by anyone with the link; 'private' only by members.",
  favorite: "Whether the board is in the current user's favourites.",
  isArchived: "Archive (true) or restore (false) the board.",
  archived: "List archived boards (true) or active ones (false).",
  type: "'regular' for boards, 'template' for board templates. Defaults to regular.",
  lists:
    "Names of the lists to create, in order, e.g. ['To do', 'Doing', 'Done'].",
  labels: "Names of the labels to create, e.g. ['Bug', 'Feature'].",
  query: "Text to search for in board and card titles.",
  limit: "Maximum number of results to return.",
  cursor:
    "Pagination cursor: pass nextCursor from the previous get_card_activities response.",
  cursorPublicId:
    "Pagination cursor: pass nextCursorPublicId from the previous get_card_activities response.",
  order: "'oldest' first or 'newest' first.",
  role: "Role to assign.",
  permission: "The permission, as resource:action, e.g. board:edit.",
  email: "Email address to invite.",
  showEmailsToMembers: "Whether members can see each other's email addresses.",
  weekStartDay:
    "First day of the week in calendars: 0 Sunday, 1 Monday or 6 Saturday.",
  url: "HTTPS URL to send events to. Must be a public host.",
  secret:
    "Optional secret used to sign each delivery so the receiver can verify it.",
  events: "Card events to send, e.g. ['card.created', 'card.moved'].",
  active: "Whether the webhook sends events.",
  image: "Avatar image URL.",
  feedback: "The feedback message.",
};
