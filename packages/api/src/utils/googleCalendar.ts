import type { dbClient } from "@banana/db/client";
import { env } from "next-runtime-env";

import { applyTimeOfDay } from "@banana/db/repository/cardNotification.repo";
import * as integrationsRepo from "@banana/db/repository/integration.repo";

import { decryptToken, encryptToken } from "./encryption";

const log =
  typeof console !== "undefined"
    ? console
    : { error: () => {}, info: () => {}, warn: () => {} };

export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  source?: { title: string; url: string };
  recurrence?: string[];
  reminders?: {
    useDefault: boolean;
    overrides?: { method: string; minutes: number }[];
  };
  extendedProperties?: {
    private?: {
      cardPublicId?: string;
      cardNotificationPublicId?: string;
      eventType?: "dueDate" | "reminder" | "overdue";
    };
  };
}

interface CardEventData {
  cardPublicId: string;
  title: string;
  description: string;
  dueDate: Date;
  boardName?: string | null;
  listName?: string | null;
}

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

function getClientId(): string {
  const id = process.env.GOOGLE_CLIENT_ID ?? env("GOOGLE_CLIENT_ID");
  if (!id) throw new Error("GOOGLE_CLIENT_ID not set");
  return id;
}

function getClientSecret(): string {
  const secret =
    process.env.GOOGLE_CLIENT_SECRET ?? env("GOOGLE_CLIENT_SECRET");
  if (!secret) throw new Error("GOOGLE_CLIENT_SECRET not set");
  return secret;
}

function getRedirectUri(): string {
  const base = env("NEXT_PUBLIC_BASE_URL") ?? "http://localhost:3000";
  return `${base}/api/calendar/oauth/callback`;
}

export function buildAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar.events",
    access_type: "offline",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
}> {
  const resp = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: getClientId(),
      client_secret: getClientSecret(),
      redirect_uri: getRedirectUri(),
      grant_type: "authorization_code",
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Token exchange failed (${resp.status}): ${body}`);
  }

  const data = (await resp.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  const expiresAt = new Date(Date.now() + (data.expires_in ?? 3600) * 1000);

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt,
  };
}

async function refreshAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresAt: Date }> {
  const resp = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: getClientId(),
      client_secret: getClientSecret(),
      grant_type: "refresh_token",
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Token refresh failed (${resp.status}): ${body}`);
  }

  const data = (await resp.json()) as {
    access_token: string;
    expires_in: number;
  };

  const expiresAt = new Date(Date.now() + (data.expires_in ?? 3600) * 1000);

  return { accessToken: data.access_token, expiresAt };
}

/**
 * Return a valid (non-expired, freshly-refreshed if needed) Google Calendar
 * access token for the user, or null if the integration is dead. A dead token
 * (Google revoked the grant, or no refresh token exists) returns null WITHOUT
 * deleting the integration row — the user must explicitly Disconnect to clear
 * it. Calendar events are never touched by this path.
 */
export async function getValidAccessToken(
  db: dbClient,
  userId: string,
): Promise<string | null> {
  const integration = await integrationsRepo.getProviderForUserRaw(
    db,
    userId,
    "google_calendar",
  );

  if (!integration) return null;

  // Refresh if expiring within 5 minutes
  const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000);
  if (integration.expiresAt < fiveMinFromNow && integration.refreshToken) {
    const decryptedRefresh = decryptToken(integration.refreshToken);
    try {
      const { accessToken, expiresAt } =
        await refreshAccessToken(decryptedRefresh);

      const encryptedAccess = encryptToken(accessToken);
      await integrationsRepo.createOrUpdateProvider(db, {
        provider: "google_calendar",
        userId,
        accessToken: encryptedAccess,
        refreshToken: integration.refreshToken,
        expiresAt,
      });

      return accessToken;
    } catch (error) {
      // Refresh failed — likely Google revoked the grant (invalid_grant).
      // The integration is dead; leave the row in place (no auto-cleanup) and
      // let the caller treat it as unavailable.
      const msg =
        error instanceof Error ? error.message : String(error);
      log.warn(
        { userId, error: msg },
        "[GoogleCalendar] Token refresh failed; integration left in place",
      );
      return null;
    }
  }

  // Token is already expired and there's no refresh token to salvage it.
  if (integration.expiresAt < new Date() && !integration.refreshToken) {
    log.warn(
      { userId },
      "[GoogleCalendar] Token expired without refresh token; integration left in place",
    );
    return null;
  }

  return decryptToken(integration.accessToken);
}

export async function storeTokens(
  db: dbClient,
  userId: string,
  tokens: { accessToken: string; refreshToken: string | null; expiresAt: Date },
): Promise<void> {
  const encryptedAccess = encryptToken(tokens.accessToken);
  const encryptedRefresh = tokens.refreshToken
    ? encryptToken(tokens.refreshToken)
    : null;

  await integrationsRepo.createOrUpdateProvider(db, {
    provider: "google_calendar",
    userId,
    accessToken: encryptedAccess,
    refreshToken: encryptedRefresh,
    expiresAt: tokens.expiresAt,
  });
}

function buildEvent(card: CardEventData): GoogleCalendarEvent {
  const oneHourLater = new Date(card.dueDate.getTime() + 60 * 60 * 1000);
  return {
    summary: card.title,
    description: `${card.boardName ?? ""} › ${card.listName ?? ""}\n\n${card.description}`,
    start: { dateTime: card.dueDate.toISOString(), timeZone: "UTC" },
    end: { dateTime: oneHourLater.toISOString(), timeZone: "UTC" },
    source: {
      title: "Banana",
      url: `${env("NEXT_PUBLIC_BASE_URL") ?? "http://localhost:3000"}/cards/${card.cardPublicId}`,
    },
    extendedProperties: {
      private: {
        cardPublicId: card.cardPublicId,
        eventType: "dueDate",
      },
    },
  };
}

async function calendarApiFetch(
  accessToken: string,
  path: string,
  options: RequestInit = {},
) {
  const resp = await fetch(`${GOOGLE_CALENDAR_API}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!resp.ok) {
    const body = await resp.text();
    if (resp.status === 404) return null;
    throw new Error(`Google Calendar API error (${resp.status}): ${body}`);
  }

  if (resp.status === 204) return null;
  return resp.json();
}

export async function upsertCalendarEvent(
  accessToken: string,
  card: CardEventData,
): Promise<void> {
  // Delete existing events for this card first, then create new one
  // This ensures updates (date change) work correctly
  await deleteCalendarEvent(accessToken, card.cardPublicId);

  const event = buildEvent(card);
  await calendarApiFetch(accessToken, `/calendars/primary/events`, {
    method: "POST",
    body: JSON.stringify(event),
  });
}

export async function deleteCalendarEvent(
  accessToken: string,
  cardPublicId: string,
): Promise<void> {
  // Only match the card's main due-date event (eventType=dueDate) so we never
  // delete per-card reminder/overdue events, which are managed separately.
  // Google ANDs multiple privateExtendedProperty params.
  const searchResult = await calendarApiFetch(
    accessToken,
    `/calendars/primary/events?privateExtendedProperty=cardPublicId=${cardPublicId}&privateExtendedProperty=eventType=dueDate`,
    { method: "GET" },
  );

  const events = searchResult as { items?: { id: string }[] } | null;
  if (events?.items) {
    for (const evt of events.items) {
      await calendarApiFetch(
        accessToken,
        `/calendars/primary/events/${evt.id}`,
        { method: "DELETE" },
      );
    }
  }
}

/** Does the card's due-date event already exist on the primary calendar? */
async function cardCalendarEventExists(
  accessToken: string,
  cardPublicId: string,
): Promise<boolean> {
  const searchResult = await calendarApiFetch(
    accessToken,
    `/calendars/primary/events?privateExtendedProperty=cardPublicId=${cardPublicId}&privateExtendedProperty=eventType=dueDate`,
    { method: "GET" },
  );
  const events = searchResult as { items?: unknown[] } | null;
  return !!events?.items && events.items.length > 0;
}

/**
 * Create the card's due-date event only if one isn't already on the calendar.
 * Used by the connect-time bulk sync so a re-sync never duplicates events. The
 * live per-card sync keeps the delete-then-create upsert so card edits still
 * move the event.
 */
async function ensureCalendarEvent(
  accessToken: string,
  card: CardEventData,
): Promise<void> {
  if (await cardCalendarEventExists(accessToken, card.cardPublicId)) return;
  const event = buildEvent(card);
  await calendarApiFetch(accessToken, `/calendars/primary/events`, {
    method: "POST",
    body: JSON.stringify(event),
  });
}

type SyncAction = "create" | "update" | "delete";

interface SyncCardInfo {
  cardPublicId: string;
  title: string;
  description: string;
  dueDate: Date | null;
  boardName?: string | null;
  listName?: string | null;
}

export async function getCardMemberUserIds(
  db: dbClient,
  cardPublicId: string,
): Promise<string[]> {
  const { cardToWorkspaceMembers, workspaceMembers, cards } = await import(
    "@banana/db/schema"
  );
  const { eq, and, isNull } = await import("drizzle-orm");

  const result = await db
    .select({ userId: workspaceMembers.userId })
    .from(cardToWorkspaceMembers)
    .innerJoin(
      workspaceMembers,
      eq(cardToWorkspaceMembers.workspaceMemberId, workspaceMembers.id),
    )
    .innerJoin(cards, eq(cardToWorkspaceMembers.cardId, cards.id))
    .where(
      and(
        eq(cards.publicId, cardPublicId),
        isNull(cards.deletedAt),
        isNull(workspaceMembers.deletedAt),
      ),
    );
  return result.map((r) => r.userId).filter((id): id is string => id !== null);
}

export async function getAssignedDueCardsForUser(
  db: dbClient,
  userId: string,
): Promise<SyncCardInfo[]> {
  const { cardToWorkspaceMembers, workspaceMembers, cards, lists, boards } =
    await import("@banana/db/schema");
  const { eq, and, isNull, isNotNull } = await import("drizzle-orm");

  const result = await db
    .select({
      cardPublicId: cards.publicId,
      title: cards.title,
      description: cards.description,
      dueDate: cards.dueDate,
      boardName: boards.name,
      listName: lists.name,
    })
    .from(cardToWorkspaceMembers)
    .innerJoin(
      workspaceMembers,
      eq(cardToWorkspaceMembers.workspaceMemberId, workspaceMembers.id),
    )
    .innerJoin(cards, eq(cardToWorkspaceMembers.cardId, cards.id))
    .innerJoin(lists, eq(cards.listId, lists.id))
    .innerJoin(boards, eq(lists.boardId, boards.id))
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        isNotNull(cards.dueDate),
        isNull(cards.deletedAt),
        isNull(workspaceMembers.deletedAt),
        isNull(lists.deletedAt),
        isNull(boards.deletedAt),
      ),
    );

  return result.map((row) => ({
    cardPublicId: row.cardPublicId,
    title: row.title,
    description: row.description ?? "",
    dueDate: row.dueDate,
    boardName: row.boardName,
    listName: row.listName,
  }));
}

/**
 * Cards assigned to a user that have NO due date but DO have at least one
 * `google_calendar` reminder. On connect these are synced for their reminder
 * events only (a relative reminder needs a due date and is skipped, so only
 * absolute reminders produce events here). They never get a due-date event.
 */
export async function getAssignedNoDueDateCardsWithRemindersForUser(
  db: dbClient,
  userId: string,
): Promise<SyncCardInfo[]> {
  const {
    cardToWorkspaceMembers,
    workspaceMembers,
    cards,
    lists,
    boards,
    cardNotifications,
  } = await import("@banana/db/schema");
  const { eq, and, isNull, exists } = await import("drizzle-orm");

  const result = await db
    .select({
      cardPublicId: cards.publicId,
      title: cards.title,
      description: cards.description,
      dueDate: cards.dueDate,
      boardName: boards.name,
      listName: lists.name,
    })
    .from(cardToWorkspaceMembers)
    .innerJoin(
      workspaceMembers,
      eq(cardToWorkspaceMembers.workspaceMemberId, workspaceMembers.id),
    )
    .innerJoin(cards, eq(cardToWorkspaceMembers.cardId, cards.id))
    .innerJoin(lists, eq(cards.listId, lists.id))
    .innerJoin(boards, eq(lists.boardId, boards.id))
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        isNull(cards.dueDate),
        isNull(cards.deletedAt),
        isNull(workspaceMembers.deletedAt),
        isNull(lists.deletedAt),
        isNull(boards.deletedAt),
        exists(
          db
            .select({ one: cardNotifications.id })
            .from(cardNotifications)
            .where(
              and(
                eq(cardNotifications.cardId, cards.id),
                eq(cardNotifications.channel, "google_calendar"),
                isNull(cardNotifications.deletedAt),
              ),
            ),
        ),
      ),
    );

  return result.map((row) => ({
    cardPublicId: row.cardPublicId,
    title: row.title,
    description: row.description ?? "",
    dueDate: row.dueDate,
    boardName: row.boardName,
    listName: row.listName,
  }));
}

export async function syncAllCardsForUser(
  db: dbClient,
  userId: string,
): Promise<void> {
  const accessToken = await getValidAccessToken(db, userId);
  if (!accessToken) {
    console.log(
      `[GoogleCalendar] No token for user ${userId}, skipping sync all`,
    );
    return;
  }

  // Cards with a due date: push their due-date event + their reminders.
  const cardsToSync = await getAssignedDueCardsForUser(db, userId);
  // Cards without a due date but with google_calendar reminders: push their
  // reminders only (relative reminders need a due date and are skipped).
  const reminderOnlyCards =
    await getAssignedNoDueDateCardsWithRemindersForUser(db, userId);
  console.log(
    `[GoogleCalendar] Initial sync: ${cardsToSync.length} due-date card(s), ${reminderOnlyCards.length} reminder-only card(s) for user ${userId}`,
  );

  const results = await Promise.allSettled([
    ...cardsToSync.map(async (card) => {
      await ensureCalendarEvent(accessToken, {
        cardPublicId: card.cardPublicId,
        title: card.title,
        description: card.description,
        dueDate: card.dueDate!,
        boardName: card.boardName,
        listName: card.listName,
      });
      // Push the card's google_calendar reminders alongside its due-date event.
      await syncAllCardNotificationsForUser(
        db,
        accessToken,
        {
          publicId: card.cardPublicId,
          title: card.title,
          dueDate: card.dueDate,
        },
        "ensure",
      );
    }),
    ...reminderOnlyCards.map(async (card) => {
      // No due date → no due-date event. Push the card's google_calendar
      // reminders only (absolute reminders; relative ones are skipped).
      await syncAllCardNotificationsForUser(
        db,
        accessToken,
        {
          publicId: card.cardPublicId,
          title: card.title,
          dueDate: card.dueDate,
        },
        "ensure",
      );
    }),
  ]);

  const total = cardsToSync.length + reminderOnlyCards.length;
  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed > 0) {
    console.error(
      `[GoogleCalendar] Initial sync: ${failed}/${total} cards failed for user ${userId}`,
    );
  } else {
    console.log(
      `[GoogleCalendar] Initial sync complete for user ${userId}: ${total} cards`,
    );
  }
}

export async function syncCardToGoogleCalendarsForMembers(
  db: dbClient,
  card: SyncCardInfo,
  action: SyncAction,
  memberUserIds: string[],
): Promise<void> {
  if (!card.dueDate && action !== "delete") return;

  console.log(
    `[GoogleCalendar] Syncing card ${card.cardPublicId} (action=${action}) for ${memberUserIds.length} users`,
  );

  try {
    const results = await Promise.allSettled(
      memberUserIds.map(async (userId) => {
        const accessToken = await getValidAccessToken(db, userId);
        if (!accessToken) {
          console.log(`[GoogleCalendar] No token for user ${userId}, skipping`);
          return;
        }

        if (action === "delete" || !card.dueDate) {
          // Remove the card's full calendar presence: due-date event plus any
          // reminder / daily-overdue events.
          await stopCardNotifications(accessToken, card.cardPublicId);
          console.log(
            `[GoogleCalendar] Deleted event for card ${card.cardPublicId} for user ${userId}`,
          );
        } else {
          await upsertCalendarEvent(accessToken, {
            cardPublicId: card.cardPublicId,
            title: card.title,
            description: card.description ?? "",
            dueDate: card.dueDate,
            boardName: card.boardName,
            listName: card.listName,
          });
          // Bring the card's google_calendar reminders along with the event.
          await syncAllCardNotificationsForUser(db, accessToken, {
            publicId: card.cardPublicId,
            title: card.title,
            dueDate: card.dueDate,
          });
          console.log(
            `[GoogleCalendar] Upserted event for card ${card.cardPublicId} for user ${userId}`,
          );
        }
      }),
    );

    for (const result of results) {
      if (result.status === "rejected") {
        console.error(
          `[GoogleCalendar] Sync failed for card ${card.cardPublicId}:`,
          result.reason,
        );
      }
    }
  } catch (error) {
    console.error(
      `[GoogleCalendar] Sync error for card ${card.cardPublicId}:`,
      error,
    );
  }
}

interface CardToDelete {
  publicId: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
}

export async function deleteCardsFromGoogleCalendars(
  db: dbClient,
  cards: CardToDelete[],
): Promise<void> {
  const cardsWithDueDate = cards.filter((c) => c.dueDate);
  if (cardsWithDueDate.length === 0) return;

  console.log(
    `[GoogleCalendar] Deleting events for ${cardsWithDueDate.length} cards`,
  );

  const results = await Promise.allSettled(
    cardsWithDueDate.map(async (card) => {
      const memberUserIds = await getCardMemberUserIds(db, card.publicId);
      if (memberUserIds.length === 0) return;

      await syncCardToGoogleCalendarsForMembers(
        db,
        {
          cardPublicId: card.publicId,
          title: card.title,
          description: card.description ?? "",
          dueDate: null,
        },
        "delete",
        memberUserIds,
      );
    }),
  );

  for (const result of results) {
    if (result.status === "rejected") {
      console.error(
        `[GoogleCalendar] deleteCardsFromGoogleCalendars:`,
        result.reason,
      );
    }
  }
}

/* ------------------------------------------------------------------ */
/* Per-card reminder events (eventType = "reminder")                  */
/* ------------------------------------------------------------------ */

interface CardNotificationEventData {
  cardPublicId: string;
  cardNotificationPublicId: string;
  title: string;
  fireAt: Date;
  boardName?: string | null;
  listName?: string | null;
}

function buildReminderEvent(data: CardNotificationEventData): GoogleCalendarEvent {
  const fiveMinLater = new Date(data.fireAt.getTime() + 5 * 60 * 1000);
  return {
    summary: `🔔 ${data.title}`,
    description: `${data.boardName ?? ""} › ${data.listName ?? ""}`,
    start: { dateTime: data.fireAt.toISOString(), timeZone: "UTC" },
    end: { dateTime: fiveMinLater.toISOString(), timeZone: "UTC" },
    source: {
      title: "Banana",
      url: `${env("NEXT_PUBLIC_BASE_URL") ?? "http://localhost:3000"}/cards/${data.cardPublicId}`,
    },
    reminders: {
      useDefault: false,
      overrides: [{ method: "popup", minutes: 0 }],
    },
    extendedProperties: {
      private: {
        cardPublicId: data.cardPublicId,
        cardNotificationPublicId: data.cardNotificationPublicId,
        eventType: "reminder",
      },
    },
  };
}

export async function deleteCardNotificationCalendarEvent(
  accessToken: string,
  cardNotificationPublicId: string,
): Promise<void> {
  const searchResult = await calendarApiFetch(
    accessToken,
    `/calendars/primary/events?privateExtendedProperty=cardNotificationPublicId=${cardNotificationPublicId}`,
    { method: "GET" },
  );

  const events = searchResult as { items?: { id: string }[] } | null;
  if (events?.items) {
    for (const evt of events.items) {
      await calendarApiFetch(
        accessToken,
        `/calendars/primary/events/${evt.id}`,
        { method: "DELETE" },
      );
    }
  }
}

/** Delete every reminder event (eventType=reminder) for a card. */
export async function deleteCardRemindersFromCalendar(
  accessToken: string,
  cardPublicId: string,
): Promise<void> {
  const searchResult = await calendarApiFetch(
    accessToken,
    `/calendars/primary/events?privateExtendedProperty=cardPublicId=${cardPublicId}&privateExtendedProperty=eventType=reminder`,
    { method: "GET" },
  );

  const events = searchResult as { items?: { id: string }[] } | null;
  if (events?.items) {
    for (const evt of events.items) {
      await calendarApiFetch(
        accessToken,
        `/calendars/primary/events/${evt.id}`,
        { method: "DELETE" },
      );
    }
  }
}

export async function upsertCardNotificationCalendarEvent(
  accessToken: string,
  data: CardNotificationEventData,
): Promise<void> {
  await deleteCardNotificationCalendarEvent(
    accessToken,
    data.cardNotificationPublicId,
  );
  const event = buildReminderEvent(data);
  await calendarApiFetch(accessToken, `/calendars/primary/events`, {
    method: "POST",
    body: JSON.stringify(event),
  });
}

/** Does a reminder event for this notification already exist? */
async function reminderCalendarEventExists(
  accessToken: string,
  cardNotificationPublicId: string,
): Promise<boolean> {
  const searchResult = await calendarApiFetch(
    accessToken,
    `/calendars/primary/events?privateExtendedProperty=cardNotificationPublicId=${cardNotificationPublicId}`,
    { method: "GET" },
  );
  const events = searchResult as { items?: unknown[] } | null;
  return !!events?.items && events.items.length > 0;
}

/**
 * Create a reminder event only if one isn't already on the calendar. Used by
 * the connect-time bulk sync (skip-if-exists); the live per-card reminder sync
 * keeps the delete-then-create upsert so reminder times stay current.
 */
async function ensureCardNotificationCalendarEvent(
  accessToken: string,
  data: CardNotificationEventData,
): Promise<void> {
  if (
    await reminderCalendarEventExists(
      accessToken,
      data.cardNotificationPublicId,
    )
  ) {
    return;
  }
  const event = buildReminderEvent(data);
  await calendarApiFetch(accessToken, `/calendars/primary/events`, {
    method: "POST",
    body: JSON.stringify(event),
  });
}

/**
 * Push every google_calendar reminder for a card onto the user's primary
 * calendar. Called whenever the card's due-date event is synced, so the card's
 * reminders come along for the ride. Reminders with no computable fireAt (e.g.
 * a relative reminder on a card with no due date) are skipped. In `ensure`
 * mode (connect sync) existing events are left untouched to avoid duplication;
 * the default `upsert` mode (live card edits) recreates them so times stay
 * current.
 */
async function syncAllCardNotificationsForUser(
  db: dbClient,
  accessToken: string,
  card: { publicId: string; title: string; dueDate: Date | null },
  mode: "upsert" | "ensure" = "upsert",
): Promise<void> {
  const cardNotificationRepo = await import(
    "@banana/db/repository/cardNotification.repo"
  );
  const reminders = await cardNotificationRepo.listByCardPublicId(
    db,
    card.publicId,
  );
  const gcalReminders = reminders.filter(
    (r) => r.channel === "google_calendar",
  );
  if (gcalReminders.length === 0) return;

  await Promise.allSettled(
    gcalReminders.map((r) => {
      const fireAt =
        r.triggerType === "relative"
          ? cardNotificationRepo.computeRelativeFireAt(
              card.dueDate,
              r.offsetValue,
              r.offsetUnit,
              r.timeOfDay,
              r.timezone,
            )
          : cardNotificationRepo.computeAbsoluteFireAt(
              r.triggerAt,
              r.timeOfDay,
              r.timezone,
            );
      if (!fireAt) return Promise.resolve();
      const eventData: CardNotificationEventData = {
        cardPublicId: card.publicId,
        cardNotificationPublicId: r.publicId,
        title: card.title,
        fireAt,
      };
      return mode === "ensure"
        ? ensureCardNotificationCalendarEvent(accessToken, eventData)
        : upsertCardNotificationCalendarEvent(accessToken, eventData);
    }),
  );
}

export async function syncCardNotificationToGoogleCalendarsForMembers(
  db: dbClient,
  data: CardNotificationEventData,
  memberUserIds: string[],
): Promise<void> {
  console.log(
    `[GoogleCalendar] Syncing reminder ${data.cardNotificationPublicId} for ${memberUserIds.length} users`,
  );

  const results = await Promise.allSettled(
    memberUserIds.map(async (userId) => {
      const accessToken = await getValidAccessToken(db, userId);
      if (!accessToken) return;
      await upsertCardNotificationCalendarEvent(accessToken, data);
    }),
  );

  for (const result of results) {
    if (result.status === "rejected") {
      console.error(
        `[GoogleCalendar] Reminder sync failed for ${data.cardNotificationPublicId}:`,
        result.reason,
      );
    }
  }
}

export async function deleteCardNotificationFromGoogleCalendars(
  db: dbClient,
  cardNotificationPublicId: string,
  memberUserIds: string[],
): Promise<void> {
  const results = await Promise.allSettled(
    memberUserIds.map(async (userId) => {
      const accessToken = await getValidAccessToken(db, userId);
      if (!accessToken) return;
      await deleteCardNotificationCalendarEvent(
        accessToken,
        cardNotificationPublicId,
      );
    }),
  );

  for (const result of results) {
    if (result.status === "rejected") {
      console.error(
        `[GoogleCalendar] Reminder delete failed for ${cardNotificationPublicId}:`,
        result.reason,
      );
    }
  }
}

/* ------------------------------------------------------------------ */
/* Overdue daily nudge (eventType = "overdue", FREQ=DAILY)            */
/* ------------------------------------------------------------------ */

/**
 * Remove a card's Google Calendar due-date event and reminders from this
 * calendar. Called when a card is marked done (so it stops appearing on
 * members' calendars), loses its due date, or is deleted.
 */
export async function stopCardNotifications(
  accessToken: string,
  cardPublicId: string,
): Promise<void> {
  await deleteCalendarEvent(accessToken, cardPublicId);
  await deleteCardRemindersFromCalendar(accessToken, cardPublicId);
}

/**
 * Fan `stopCardNotifications` out to every member of the card who has a Google
 * Calendar token. Used when a card is marked done — removes the card's entire
 * calendar presence (due-date + reminder + overdue events) for each member.
 */
export async function stopCardNotificationsForMembers(
  db: dbClient,
  cardPublicId: string,
  memberUserIds: string[],
): Promise<void> {
  if (memberUserIds.length === 0) return;

  console.log(
    `[GoogleCalendar] Stopping notifications for card ${cardPublicId} for ${memberUserIds.length} users`,
  );

  const results = await Promise.allSettled(
    memberUserIds.map(async (userId) => {
      const accessToken = await getValidAccessToken(db, userId);
      if (!accessToken) return;
      await stopCardNotifications(accessToken, cardPublicId);
    }),
  );

  for (const result of results) {
    if (result.status === "rejected") {
      console.error(
        `[GoogleCalendar] stopCardNotifications failed for card ${cardPublicId}:`,
        result.reason,
      );
    }
  }
}
