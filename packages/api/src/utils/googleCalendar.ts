import type { dbClient } from "@banana/db/client";
import { env } from "next-runtime-env";

import * as integrationsRepo from "@banana/db/repository/integration.repo";

import { decryptToken, encryptToken } from "./encryption";

export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  source?: { title: string; url: string };
  extendedProperties?: {
    private?: { cardPublicId?: string };
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

export async function getValidAccessToken(
  db: dbClient,
  userId: string,
): Promise<string | null> {
  const integration = await integrationsRepo.getProviderForUser(
    db,
    userId,
    "google_calendar",
  );

  if (!integration) return null;

  // Refresh if expiring within 5 minutes
  const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000);
  if (integration.expiresAt < fiveMinFromNow && integration.refreshToken) {
    const decryptedRefresh = decryptToken(integration.refreshToken);
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
  const searchResult = await calendarApiFetch(
    accessToken,
    `/calendars/primary/events?privateExtendedProperty=cardPublicId=${cardPublicId}`,
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

  const cardsToSync = await getAssignedDueCardsForUser(db, userId);
  console.log(
    `[GoogleCalendar] Initial sync: pushing ${cardsToSync.length} cards for user ${userId}`,
  );

  const results = await Promise.allSettled(
    cardsToSync.map((card) =>
      upsertCalendarEvent(accessToken, {
        cardPublicId: card.cardPublicId,
        title: card.title,
        description: card.description,
        dueDate: card.dueDate!,
        boardName: card.boardName,
        listName: card.listName,
      }),
    ),
  );

  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed > 0) {
    console.error(
      `[GoogleCalendar] Initial sync: ${failed}/${cardsToSync.length} cards failed for user ${userId}`,
    );
  } else {
    console.log(
      `[GoogleCalendar] Initial sync complete for user ${userId}: ${cardsToSync.length} cards`,
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
          await deleteCalendarEvent(accessToken, card.cardPublicId);
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
