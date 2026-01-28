# AGENTS.md

## Project Overview

Kan is an open-source project management tool (Trello alternative) built with:

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: tRPC, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Monorepo**: pnpm workspaces with Turbo
- **Auth**: Better Auth
- **Internationalization**: Lingui

## Setup Commands

- Install deps: `pnpm install`
- Start dev server: `pnpm dev`
- Create migrations: `cd packages/db && pnpm drizzle-kit generate --name "AddFieldToTable"`
- Run database migrations: `pnpm db:migrate`
- Run linter: `pnpm lint`
- Run type check: `pnpm typecheck`
- Format code: `pnpm format:fix`
- Extract i18n strings: `pnpm lingui:extract`

## Project Structure

- `apps/web/` - Next.js web application
- `packages/api/` - tRPC API routers
- `packages/db/` - Database schema, migrations, and repositories
- `packages/auth/` - Authentication package
- `packages/shared/` - Shared utilities
- `packages/email/` - Email templates and sending
- `packages/stripe/` - Stripe integration
- `tooling/` - Shared tooling configs (ESLint, Prettier, TypeScript)

## Code Style

### TypeScript

- Use TypeScript strictly - avoid `any` types
- Prefer explicit types over inference when it improves clarity
- Use `as const` for literal types when appropriate
- Follow existing patterns for type definitions

### Naming Conventions

- **Files**: kebab-case for files (e.g., `card-repo.ts`)
- **Components**: PascalCase for React components
- **Functions**: camelCase for functions
- **Constants**: UPPER_SNAKE_CASE for constants
- **Types/Interfaces**: PascalCase

### Database Layer (`packages/db/`)

- **Schema**: Define schemas in `src/schema/` using Drizzle ORM
- **Migrations**: Create migrations with `cd packages/db && pnpm drizzle-kit generate --name "MigrationName"`, then run with `pnpm db:migrate`
- **Repositories**: Put database queries in `src/repository/` files
- **Soft Deletes**: Use `deletedAt` timestamp for soft deletion (not hard deletes)
- **Index Management**: Cards have `index` fields that must be maintained sequentially per list
- **Activity Logging**: Use `card_activity` table to track all card changes

### API Layer (`packages/api/`)

- **Routers**: Create tRPC routers in `src/routers/`
- **Procedures**: Use `protectedProcedure` for authenticated endpoints, `publicProcedure` for public
- **Validation**: Use Zod schemas for input validation
- **Error Handling**: Use `TRPCError` with appropriate error codes
- **OpenAPI**: Add OpenAPI metadata for all endpoints
- **Authorization**: Always check workspace membership with `assertUserInWorkspace`

### Frontend (`apps/web/`)

- **Components**: React components in `src/components/`
- **Views**: Page-level components in `src/views/`
- **Hooks**: Custom hooks in `src/hooks/`
- **i18n**: Use `t` template literal for translations (Lingui)
- **Styling**: Use Tailwind CSS classes
- **State Management**: Use tRPC React Query hooks for server state
- **Modals**: Use `useModal` hook for modal management
- **Popups**: Use `usePopup` hook for toast notifications

## Key Concepts

### Cards

- Cards are the main entity in Kan
- Cards belong to Lists, which belong to Boards
- Cards have: title, description, labels, members, checklists, comments, attachments, due dates
- Cards use soft deletion (`deletedAt` field)
- Cards have an `index` field that must be maintained sequentially per list
- All card changes are tracked in `card_activity` table

### Activity Tracking

- Every significant card change creates an activity record
- Activity types include: created, updated (various fields), etc.
- Activities are displayed in card activity feeds

### Workspaces & Boards

- Users belong to Workspaces
- Boards belong to Workspaces
- Workspace members have different permission levels
- Boards can be public or private

### Soft Deletion Pattern

- Entities use `deletedAt` timestamp for soft deletion
- Queries filter with `isNull(table.deletedAt)` to exclude deleted items

## File Locations Reference

### Database

- Schema: `packages/db/src/schema/*.ts`
- Repositories: `packages/db/src/repository/*.repo.ts`
- Migrations: `packages/db/migrations/`

### API

- Routers: `packages/api/src/routers/*.ts`
- Utils: `packages/api/src/utils/`
- Types: `packages/api/src/types/`

### Frontend

- Components: `apps/web/src/components/`
- Views: `apps/web/src/views/`
- Pages: `apps/web/src/pages/`
- Hooks: `apps/web/src/hooks/`
- Utils: `apps/web/src/utils/`
- Locales: `apps/web/src/locales/`

## Database Patterns

- **Soft Deletes**: Always filter with `isNull(table.deletedAt)` in queries
- **Public IDs**: Use 12-character public IDs (`publicId`) for all user-facing entities
- **Internal IDs**: Never expose internal database IDs (e.g., `id`, `cardId`, `listId`) in API responses or URLs - always use `publicId` externally
- **Transactions**: Use database transactions for multi-step operations
- **Index Management**: When deleting/moving cards, maintain sequential indices
- **Activity Tracking**: Create activity records for all significant changes

## API Patterns

- **Input Validation**: Always validate inputs with Zod
- **Error Messages**: Provide clear, user-friendly error messages
- **Optimistic Updates**: Use tRPC's `onMutate` for optimistic UI updates
- **Cache Invalidation**: Properly invalidate queries after mutations
- **ID Exposure**: Never expose internal database IDs (`id`, `cardId`, `listId`, etc.) in API responses, URLs, or frontend code - always use `publicId` for external communication

## Important Patterns

### Card Index Management

When cards are created, moved, or deleted, their indices must be maintained:

- New cards: Append to end (max index + 1) or insert at position
- Moving cards: Adjust indices of affected cards
- Deleting cards: Decrement indices of cards after deleted one
- Always use transactions for index updates

### Activity Logging

Create activity records for:

- Card creation
- Card updates (title, description, list, etc.)
- Label/member additions/removals
- Comments
- Checklists and items
- Attachments
- Due dates

### Authorization

Always check:

1. User is authenticated
2. User has access to workspace
3. User has permission for the operation

Use `assertUserInWorkspace` helper for workspace checks.

### Error Handling

- Use TRPCError with appropriate codes (UNAUTHORIZED, NOT_FOUND, etc.)
- Provide user-friendly error messages
- Log errors appropriately
- Show popup notifications for user-facing errors

## Common Patterns

### Creating a Card

1. Create card in repository with proper index management
2. Create `card.created` activity
3. Handle label/member relationships if provided
4. Return the created card

### Updating a Card

1. Validate user has workspace access
2. Update card fields
3. Create appropriate activity records
4. Invalidate relevant queries

### Querying Cards

- Always filter by `isNull(cards.deletedAt)` in queries
- Include related data (labels, members, checklists) via Drizzle relations
- Order by `index` for proper card ordering

## Adding a New Feature

1. **Database**: Update schema in `packages/db/src/schema/`
2. **Migration**: Create migration with `cd packages/db && pnpm drizzle-kit generate --name "MigrationName"`, then run with `pnpm db:migrate`
3. **Repository**: Add repository functions in `packages/db/src/repository/`
4. **API**: Add tRPC router procedures in `packages/api/src/routers/`
5. **Frontend**: Add UI components in `apps/web/src/`
6. **i18n**: Add translations for new strings

## Database Changes

- Always create migrations (never modify existing migrations)
- Create migrations with: `cd packages/db && pnpm drizzle-kit generate --name "MigrationName"`
- Run migrations with: `pnpm db:migrate`
- Update schema files in `packages/db/src/schema/`
- Test migrations on development database first
- Update TypeScript types after schema changes
- Consider index management for card operations

## API Endpoints

- Use tRPC procedures (not REST)
- Add OpenAPI metadata for documentation
- Validate inputs with Zod
- Check workspace permissions
- Create activity records for significant changes

## Frontend Components

- Use Tailwind for styling
- Follow existing component patterns
- Use tRPC hooks for data fetching
- Implement optimistic updates where appropriate
- Add proper loading and error states

## Testing Instructions

- Test database operations in transactions that rollback
- Test authorization checks
- Test index management when moving/deleting cards
- Test activity logging
- Test UI interactions
- Run `pnpm lint` and `pnpm typecheck` before committing

## Performance Considerations

- Use database indexes appropriately
- Batch operations when possible
- Avoid N+1 queries
- Use transactions for related operations
- Implement optimistic updates in UI

## Security

- Always check workspace membership before operations
- Validate all inputs
- Never expose internal database IDs (`id`, `cardId`, `listId`, etc.) in API responses, URLs, or frontend code - always use `publicId` externally
- Sanitize user input

## Internationalization

- All user-facing strings must use `t` template literal
- Add translations to locale files in `apps/web/src/locales/`
- Run `pnpm lingui:extract` to update translation files
- Update locale files for all languages

## Dependencies

- Use workspace dependencies (`workspace:*`) for internal packages
- Keep dependencies up to date
- Use catalog for shared dependency versions

## When Implementing Features

### Adding New Card Fields

1. Update schema in `packages/db/src/schema/cards.ts`
2. Create migration
3. Update repository functions
4. Add API endpoints
5. Update frontend components
6. Add activity tracking if needed

### Adding New Activity Types

1. Add to `activityTypes` array in schema
2. Create migration to update enum
3. Use in activity creation code
4. Update activity display components if needed

## Git & Commits

- Use conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, etc.
- Keep commits focused on single changes
- Reference issue numbers when applicable

## PR Instructions

- Title format: `feat: description` or `fix: description`
- Always run `pnpm lint` and `pnpm typecheck` before committing
- Provide clear description of changes
- Include screenshots for UI changes
- Keep PRs focused on a single feature/fix
