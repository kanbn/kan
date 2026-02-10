# Feature Request: @Mention in Card Comments with Email Notifications

## Problem Statement

Currently, Kan supports `@mentions` only in **card descriptions** (via TipTap editor). The **card comment system** uses a plain `react-contenteditable` input that does not support `@mentions`. This means:

1. **Users cannot tag teammates in comments** — a core collaboration feature expected in project management tools.
2. **No email notifications are triggered** when someone is referenced in a comment, so team members miss important updates unless they manually check the card.
3. **SMTP/SES infrastructure is underutilized** — the existing email system supports magic links, workspace invites, and password resets, but does not cover the most common collaboration scenario: being mentioned in a discussion.

## Solution Overview

### Frontend: @Mention Support in Comments

- **Created a shared `MentionSuggestion` module** (`apps/web/src/components/MentionSuggestion.tsx`) by extracting the `MentionList`, `renderMentionSuggestions`, and related utilities from `Editor.tsx`. This eliminates code duplication and provides a single source of truth for mention UI components.

- **Created a lightweight `CommentEditor` component** (`apps/web/src/components/CommentEditor.tsx`) — a minimal TipTap editor configured with only `StarterKit`, `Mention`, `Placeholder`, and `Link` extensions. No slash commands, YouTube embeds, typography, markdown, or bubble menu — keeping it fast and focused for comments.

- **Updated `NewCommentForm`** to use `CommentEditor` instead of `react-contenteditable`, enabling the `@` trigger for mention suggestions.

- **Updated `Comment` (edit mode)** to use `CommentEditor` for editing comments with mention support. Display mode still uses `ContentEditable` with `disabled={true}` to avoid initializing a TipTap editor instance for every rendered comment (performance optimization).

- **Added global `.mention` CSS styles** in `globals.css` so mention chips (blue highlighted spans) render correctly in both the editor and displayed comments.

- **Plumbed `workspaceMembers` data** through `card/index.tsx` → `ActivityList` → `Comment` and `NewCommentForm`, using the already-available `board.workspace.members` data from the card query.

### Backend: Email Notification Dispatch

- **Created `mentions.ts` utility** (`packages/api/src/utils/mentions.ts`) with:
  - `extractMentionedMemberIds(html)` — regex-based extraction of member publicIds from `data-type="mention"` spans in HTML
  - `stripHtml(html)` — strips HTML tags for plain-text email preview

- **Added `getMembersWithEmailsByPublicIds`** to the workspace repository — looks up active workspace members by an array of publicIds, including their email addresses via the user relation.

- **Added `getCardNotificationContext`** to the card repository — lightweight query returning card title, board publicId, and workspace name/slug for building notification URLs.

- **Updated the `addComment` tRPC mutation** (`packages/api/src/routers/card.ts`) — after creating the comment and activity record, a fire-and-forget async block:
  1. Checks if email is disabled (`NEXT_PUBLIC_DISABLE_EMAIL`)
  2. Extracts mentioned member IDs from comment HTML
  3. Looks up member emails
  4. Fetches card context (title, workspace, board)
  5. Sends `MENTION_NOTIFICATION` email to each mentioned member (excluding the comment author)
  6. Catches and logs errors — never blocks comment creation

### Email Template

- **Created `mention-notification.tsx`** (`packages/email/src/templates/mention-notification.tsx`) using `@react-email/components`, following the existing template patterns (join-workspace, magic-link). Includes:
  - Preview text: `"{name} mentioned you in {cardTitle}"`
  - Comment preview with styled quote block
  - "View Card" CTA button linking directly to the card
  - White-label awareness (`NEXT_PUBLIC_WHITE_LABEL_HIDE_POWERED_BY`)

- **Registered the template** in `sendEmail.tsx` as `MENTION_NOTIFICATION`.

## Files Changed

### New Files
| File | Purpose |
|------|---------|
| `apps/web/src/components/MentionSuggestion.tsx` | Shared mention UI components (MentionList, renderMentionSuggestions, WorkspaceMember interface) |
| `apps/web/src/components/CommentEditor.tsx` | Lightweight TipTap editor for comments with @mention support |
| `packages/email/src/templates/mention-notification.tsx` | Email template for mention notifications |
| `packages/api/src/utils/mentions.ts` | Server-side mention parsing utilities |
| `packages/api/src/utils/__tests__/mentions.test.ts` | Unit tests for mention parsing |
| `docs/feature-mention-notifications.md` | This document |

### Modified Files
| File | Change |
|------|--------|
| `apps/web/src/components/Editor.tsx` | Imports from shared `MentionSuggestion` module instead of defining mention components inline |
| `apps/web/src/styles/globals.css` | Added global `.mention` CSS styles |
| `apps/web/src/views/card/components/NewCommentForm.tsx` | Replaced `react-contenteditable` with `CommentEditor`, added `workspaceMembers` prop |
| `apps/web/src/views/card/components/Comment.tsx` | Uses `CommentEditor` in edit mode, added `workspaceMembers` prop |
| `apps/web/src/views/card/components/ActivityList.tsx` | Accepts and forwards `workspaceMembers` prop |
| `apps/web/src/views/card/index.tsx` | Passes `workspaceMembers` to `ActivityList` and `NewCommentForm` |
| `packages/email/src/sendEmail.tsx` | Registered `MENTION_NOTIFICATION` template |
| `packages/db/src/repository/workspace.repo.ts` | Added `getMembersWithEmailsByPublicIds` function |
| `packages/db/src/repository/card.repo.ts` | Added `getCardNotificationContext` function |
| `packages/api/src/routers/card.ts` | Added mention notification logic to `addComment` mutation |

## Backward Compatibility

- **No database schema changes** — mentions are embedded in comment HTML as `<span data-type="mention" ...>` elements. The existing `comment` column (`text` type) stores HTML without modification.
- **Existing plain-text comments** render correctly — `ContentEditable` with `disabled={true}` handles both plain text and HTML content.
- **The `workspaceMembers` prop is optional** (defaults to `[]`) on `ActivityList` and `Comment`, so existing usages (e.g., public board `CardModal`) work without changes.
- **Email notifications are fire-and-forget** — failures are logged but never block comment creation. If SMTP is not configured, the feature gracefully degrades.
- **Respects existing settings** — `NEXT_PUBLIC_DISABLE_EMAIL`, `NEXT_PUBLIC_WHITE_LABEL_HIDE_POWERED_BY`, and workspace email privacy settings are all honored.

## Testing

### Unit Tests
- `packages/api/src/utils/__tests__/mentions.test.ts` covers:
  - Single mention extraction
  - Multiple mention extraction
  - Duplicate mention deduplication
  - No mentions (plain text)
  - Empty input
  - HTML stripping

### Manual Testing Checklist
- [ ] Type `@` in a new comment — suggestion popup appears with workspace members
- [ ] Select a member — mention chip renders with blue styling
- [ ] Submit comment — mention chip displays correctly in the activity list
- [ ] Mentioned user receives an email with correct card title, workspace name, and clickable link
- [ ] Self-mentions do not trigger emails
- [ ] `NEXT_PUBLIC_DISABLE_EMAIL=true` — no emails sent, no errors
- [ ] Old plain-text comments render correctly without errors
- [ ] Edit a comment with mentions — mentions are preserved and editable
- [ ] Multiple mentions in one comment — each user gets exactly one email
- [ ] Docker build succeeds

### Pre-commit Validation
```bash
pnpm lint
pnpm typecheck
```

## Deployment Notes

- **No new environment variables required** — uses the existing SMTP configuration (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`).
- **No database migrations** — no schema changes.
- **No new dependencies** — all TipTap packages (`@tiptap/extension-mention`, `@tiptap/suggestion`, etc.) are already in `apps/web/package.json`. The `@kan/email` package is already a dependency of `@kan/api`.
- **Docker builds are unaffected** — no new build steps or configuration needed.

## Architecture Decision Records

1. **TipTap for comments vs. custom solution** — Chose TipTap because the Mention extension is already installed and configured for descriptions. Reusing it avoids building custom autocomplete/mention UI from scratch.

2. **ContentEditable for display, TipTap for input** — Avoids initializing a TipTap editor instance for every displayed comment in the activity list. Since comments can number in the hundreds, this is a meaningful performance optimization.

3. **No separate mentions table** — Mentions are embedded in HTML content. A separate table would add complexity (schema migration, sync logic) with little benefit. The HTML is the source of truth.

4. **Fire-and-forget email dispatch** — Email sending should never block the user experience. The async IIFE pattern with try/catch ensures comment creation always succeeds, even if SMTP is down.

5. **Shared MentionSuggestion module** — Extracted from `Editor.tsx` to avoid code duplication between the description editor and comment editor. Single source of truth for mention UI.
