import type { dbClient } from "@banana/db/client";
import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { env } from "next-runtime-env";

import * as cardRepo from "@banana/db/repository/card.repo";
import * as unblockAckRepo from "@banana/db/repository/cardUnblockAck.repo";
import {
  cardToWorkspaceMembers,
  comments,
  workspaceMembers,
} from "@banana/db/schema";
import { createLogger } from "@banana/logger";

const log = createLogger("mattermost");

function getMattermostConfig() {
  const url = process.env.MATTERMOST_URL;
  const token = process.env.MATTERMOST_BOT_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

function redactEmail(email: string): string {
  const atIndex = email.indexOf("@");
  if (atIndex < 1) return "***";
  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);
  return `${local[0]}***@${domain[0] ?? "*"}***`;
}

type MattermostConfig = NonNullable<ReturnType<typeof getMattermostConfig>>;

async function mattermostApi(
  config: MattermostConfig,
  path: string,
  options: RequestInit = {},
) {
  const url = `${config.url}/api/v4${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
        Authorization: `Bearer ${config.token}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      log.error({ path, status: response.status }, "Mattermost API error");
      return null;
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    log.error({ err: error, path }, "Mattermost API request failed");
    return null;
  }
}

async function getMattermostUserIdByEmail(
  config: MattermostConfig,
  email: string,
): Promise<string | null> {
  const response = await mattermostApi(
    config,
    `/users/email/${encodeURIComponent(email)}`,
  );
  if (!response) return null;

  const user = (await response.json()) as { id: string } | undefined;
  return user?.id ?? null;
}

async function getDirectMessageChannel(
  config: MattermostConfig,
  botUserId: string,
  targetUserId: string,
): Promise<string | null> {
  const response = await mattermostApi(config, "/channels/direct", {
    method: "POST",
    body: JSON.stringify([botUserId, targetUserId]),
  });
  if (!response) return null;

  const channel = (await response.json()) as { id: string } | undefined;
  return channel?.id ?? null;
}

async function getBotUserId(config: MattermostConfig): Promise<string | null> {
  const response = await mattermostApi(config, "/users/me");
  if (!response) return null;

  const user = (await response.json()) as { id: string } | undefined;
  return user?.id ?? null;
}

async function sendMattermostDM(
  config: MattermostConfig,
  mattermostUserId: string,
  message: string,
): Promise<boolean> {
  const botUserId = await getBotUserId(config);
  if (!botUserId) return false;

  const channelId = await getDirectMessageChannel(
    config,
    botUserId,
    mattermostUserId,
  );
  if (!channelId) return false;

  const response = await mattermostApi(config, "/posts", {
    method: "POST",
    body: JSON.stringify({
      channel_id: channelId,
      message,
    }),
  });

  return response !== null;
}

/**
 * Send a DM about an unblock with a "Confirm unblock" magic link. Opening the
 * link (a Banana URL carrying the ack token) marks the ack confirmed in any
 * browser. We use a plain link instead of a legacy attachment-action button
 * because current Mattermost strips the action's `integration` callback URL
 * when the post is stored — leaving the rendered button with no target, so
 * every click 404s ("Sorry, we could not find the page."). Re-sent by the
 * hourly poller until the recipient confirms (or the reminder cap elapses).
 */
async function sendMattermostDMWithConfirmLink(
  config: MattermostConfig,
  mattermostUserId: string,
  message: string,
  ackPublicId: string,
): Promise<boolean> {
  const baseUrl = env("NEXT_PUBLIC_BASE_URL");
  const confirmUrl = `${baseUrl}/api/mattermost/unblock-confirm?ack=${ackPublicId}`;
  const fullMessage = `${message}\n\n👉 **[Confirm unblock](${confirmUrl})**`;
  return sendMattermostDM(config, mattermostUserId, fullMessage);
}

async function getCardMemberEmails(
  db: dbClient,
  cardId: number,
  excludeUserId?: string,
): Promise<string[]> {
  const result = await db
    .select({ email: workspaceMembers.email })
    .from(cardToWorkspaceMembers)
    .innerJoin(
      workspaceMembers,
      and(
        eq(cardToWorkspaceMembers.workspaceMemberId, workspaceMembers.id),
        isNull(workspaceMembers.deletedAt),
      ),
    )
    .where(eq(cardToWorkspaceMembers.cardId, cardId));

  if (excludeUserId) {
    const excludeMember = await db
      .select({ email: workspaceMembers.email })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, excludeUserId))
      .limit(1);
    const excludeEmail = excludeMember[0]?.email;
    return result.map((r) => r.email).filter((e) => e !== excludeEmail);
  }

  return result.map((r) => r.email);
}

export async function notifyBlockerCompleted(
  db: dbClient,
  {
    blockerCardId,
    blockerCardPublicId,
    blockerTitle,
    actorUserId,
    actorName,
  }: {
    blockerCardId: number;
    blockerCardPublicId: string;
    blockerTitle: string;
    actorUserId: string;
    actorName: string;
  },
): Promise<void> {
  const config = getMattermostConfig();
  if (!config) return;

  try {
    // All cards that are blocked by this blocker card (via either mechanism).
    const blockedCardsResult = await db.execute(sql`
      SELECT DISTINCT c."id", c."publicId", c."title"
      FROM (
        SELECT ccl."cardId" AS "cardId"
        FROM "_checklist_item_blocking" cib
        JOIN "card_checklist_item" cci ON cci."id" = cib."checklistItemId"
        JOIN "card_checklist" ccl ON ccl."id" = cci."checklistId"
        WHERE cib."blockerCardId" = ${blockerCardId}
        UNION
        SELECT cb."cardId" AS "cardId"
        FROM "_card_blocking" cb
        WHERE cb."blockerCardId" = ${blockerCardId}
      ) blocked
      JOIN "card" c ON c."id" = blocked."cardId"
      WHERE c."deletedAt" IS NULL
    `);

    const blockedCards = (blockedCardsResult.rows ?? []) as {
      id: number;
      publicId: string;
      title: string;
    }[];

    if (blockedCards.length === 0) return;

    // Filter to only those cards that have ALL their blockers done.
    const fullyUnblocked = (
      await Promise.all(
        blockedCards.map(async (card) => {
          const remaining = await db.execute(sql`
            SELECT 1 FROM (
              SELECT cb."blockerCardId" AS "blockerCardId"
              FROM "_card_blocking" cb
              WHERE cb."cardId" = ${card.id}
              UNION
              SELECT cib."blockerCardId" AS "blockerCardId"
              FROM "_checklist_item_blocking" cib
              JOIN "card_checklist_item" cci ON cci."id" = cib."checklistItemId"
              JOIN "card_checklist" ccl ON ccl."id" = cci."checklistId"
              WHERE ccl."cardId" = ${card.id}
            ) blockers
            JOIN "card" c ON c."id" = blockers."blockerCardId"
            WHERE c."deletedAt" IS NULL AND c."isDone" = false
            LIMIT 1
          `);
          const hasRemainingBlockers =
            (remaining.rows?.length ?? 0) > 0;
          return hasRemainingBlockers ? null : card;
        }),
      )
    ).filter((c): c is NonNullable<typeof c> => c !== null);

    if (fullyUnblocked.length === 0) return;

    const baseUrl = env("NEXT_PUBLIC_BASE_URL");
    const blockerUrl = `${baseUrl}/cards/${blockerCardPublicId}`;

    log.info(
      { blockerCardId, fullyUnblockedCount: fullyUnblocked.length, actorUserId },
      "Notifying blocked-card members of fully unblocked cards",
    );

    // Group the fully-unblocked cards by member so each member gets a single DM.
    const memberCards = new Map<string, { publicId: string; title: string }[]>();
    for (const card of fullyUnblocked) {
      const emails = await getCardMemberEmails(db, card.id);
      for (const email of emails) {
        if (!email) continue;
        const list = memberCards.get(email);
        if (list) {
          list.push({ publicId: card.publicId, title: card.title });
        } else {
          memberCards.set(email, [
            { publicId: card.publicId, title: card.title },
          ]);
        }
      }
    }

    if (memberCards.size === 0) return;

    const results = await Promise.allSettled(
      [...memberCards.entries()].map(async ([email, cards]) => {
        const mmUserId = await getMattermostUserIdByEmail(config, email);
        if (!mmUserId) {
          log.warn(
            { email: redactEmail(email) },
            "Mattermost user not found for email",
          );
          return;
        }
        const cardList = cards
          .map((c) => `[${c.title}](${baseUrl}/cards/${c.publicId})`)
          .join(", ");
        const cardWord = cards.length === 1 ? "Your card" : "Your cards";
        const message = `**${actorName}** marked a blocker as done: [${blockerTitle}](${blockerUrl}).\n${cardWord} ${cardList} may now be unblocked.`;
        // Record a pending ack so the poller can re-remind hourly until the
        // recipient taps the "Confirm unblock" button.
        const ack = await unblockAckRepo.create(db, {
          mattermostUserId: mmUserId,
          messageText: message,
        });
        const sent = await sendMattermostDMWithConfirmLink(
          config,
          mmUserId,
          message,
          ack.publicId,
        );
        log.info({ sent }, "Mattermost blocker-done DM result");
      }),
    );

    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) {
      log.warn(
        { failed, total: memberCards.size },
        "Some Mattermost blocker-done DMs failed",
      );
    }
  } catch (error) {
    log.error(
      { err: error, blockerCardId },
      "Failed to send blocker-completed Mattermost notification",
    );
  }
}

/**
 * DM the members of a card that one of its blockers was removed (manually
 * unblocked). Mirrors notifyBlockerCompleted but for a single known card; the
 * member who performed the removal is excluded so they aren't notified about
 * their own action.
 */
export async function notifyCardBlockerRemoved(
  db: dbClient,
  {
    cardId,
    cardPublicId,
    cardTitle,
    blockerCardPublicId,
    blockerTitle,
    actorUserId,
    actorName,
  }: {
    cardId: number;
    cardPublicId: string;
    cardTitle: string;
    blockerCardPublicId: string;
    blockerTitle: string;
    actorUserId: string;
    actorName: string;
  },
): Promise<void> {
  const config = getMattermostConfig();
  if (!config) return;

  try {
    const baseUrl = env("NEXT_PUBLIC_BASE_URL");
    const blockerUrl = `${baseUrl}/cards/${blockerCardPublicId}`;
    const cardUrl = `${baseUrl}/cards/${cardPublicId}`;
    const message = `**${actorName}** removed a blocker: [${blockerTitle}](${blockerUrl}).\nYour card [${cardTitle}](${cardUrl}) may now be unblocked.`;

    const emails = await getCardMemberEmails(db, cardId, actorUserId);
    if (emails.length === 0) return;

    log.info({ cardId, actorUserId }, "Notifying card members of removed blocker");

    const results = await Promise.allSettled(
      emails.map(async (email) => {
        const mmUserId = await getMattermostUserIdByEmail(config, email);
        if (!mmUserId) {
          log.warn(
            { email: redactEmail(email) },
            "Mattermost user not found for email",
          );
          return;
        }
        const ack = await unblockAckRepo.create(db, {
          mattermostUserId: mmUserId,
          messageText: message,
        });
        const sent = await sendMattermostDMWithConfirmLink(
          config,
          mmUserId,
          message,
          ack.publicId,
        );
        log.info({ sent }, "Mattermost blocker-removed DM result");
      }),
    );

    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) {
      log.warn(
        { failed, total: emails.length },
        "Some Mattermost blocker-removed DMs failed",
      );
    }
  } catch (error) {
    log.error(
      { err: error, cardId },
      "Failed to send blocker-removed Mattermost notification",
    );
  }
}

/**
 * DM the members of all cards that were blocked by a now-deleted (archived)
 * blocker card. Mirrors notifyBlockerCompleted but for deletion: a soft-deleted
 * card is treated as "no longer blocking", so its blocked cards' remaining
 * blockers check correctly excludes the deleted card. The message uses "archived"
 * instead of "done" to distinguish the action.
 */
export async function notifyBlockerCardDeleted(
  db: dbClient,
  {
    blockerCardId,
    blockerCardPublicId,
    blockerTitle,
    actorUserId,
    actorName,
    blockedCards,
  }: {
    blockerCardId: number;
    blockerCardPublicId: string;
    blockerTitle: string;
    actorUserId: string;
    actorName: string;
    // Pre-captured by the caller (the delete mutation) before the blocker's
    // relationship rows are removed, since this runs fire-and-forget after them.
    blockedCards: { id: number; publicId: string; title: string }[];
  },
): Promise<void> {
  const config = getMattermostConfig();
  if (!config) return;

  if (blockedCards.length === 0) return;

  try {

    // Filter to only those cards that have ALL their blockers done — a deleted
    // card is treated as "not a blocker" (the remaining blockers query excludes
    // deleted cards), so this works correctly.
    const fullyUnblocked = (
      await Promise.all(
        blockedCards.map(async (card) => {
          const remaining = await db.execute(sql`
            SELECT 1 FROM (
              SELECT cb."blockerCardId" AS "blockerCardId"
              FROM "_card_blocking" cb
              WHERE cb."cardId" = ${card.id}
              UNION
              SELECT cib."blockerCardId" AS "blockerCardId"
              FROM "_checklist_item_blocking" cib
              JOIN "card_checklist_item" cci ON cci."id" = cib."checklistItemId"
              JOIN "card_checklist" ccl ON ccl."id" = cci."checklistId"
              WHERE ccl."cardId" = ${card.id}
            ) blockers
            JOIN "card" c ON c."id" = blockers."blockerCardId"
            WHERE c."deletedAt" IS NULL AND c."isDone" = false
            LIMIT 1
          `);
          const hasRemainingBlockers =
            (remaining.rows?.length ?? 0) > 0;
          return hasRemainingBlockers ? null : card;
        }),
      )
    ).filter((c): c is NonNullable<typeof c> => c !== null);

    if (fullyUnblocked.length === 0) return;

    const baseUrl = env("NEXT_PUBLIC_BASE_URL");
    const blockerUrl = `${baseUrl}/cards/${blockerCardPublicId}`;

    log.info(
      { blockerCardId, fullyUnblockedCount: fullyUnblocked.length, actorUserId },
      "Notifying blocked-card members of archived blocker card",
    );

    // Group the fully-unblocked cards by member so each member gets a single DM.
    const memberCards = new Map<string, { publicId: string; title: string }[]>();
    for (const card of fullyUnblocked) {
      const emails = await getCardMemberEmails(db, card.id);
      for (const email of emails) {
        if (!email) continue;
        const list = memberCards.get(email);
        if (list) {
          list.push({ publicId: card.publicId, title: card.title });
        } else {
          memberCards.set(email, [
            { publicId: card.publicId, title: card.title },
          ]);
        }
      }
    }

    if (memberCards.size === 0) return;

    const results = await Promise.allSettled(
      [...memberCards.entries()].map(async ([email, cards]) => {
        const mmUserId = await getMattermostUserIdByEmail(config, email);
        if (!mmUserId) {
          log.warn(
            { email: redactEmail(email) },
            "Mattermost user not found for email",
          );
          return;
        }
        const cardList = cards
          .map((c) => `[${c.title}](${baseUrl}/cards/${c.publicId})`)
          .join(", ");
        const cardWord = cards.length === 1 ? "Your card" : "Your cards";
        const message = `**${actorName}** archived a blocker: [${blockerTitle}](${blockerUrl}).\n${cardWord} ${cardList} may now be unblocked.`;
        const ack = await unblockAckRepo.create(db, {
          mattermostUserId: mmUserId,
          messageText: message,
        });
        const sent = await sendMattermostDMWithConfirmLink(
          config,
          mmUserId,
          message,
          ack.publicId,
        );
        log.info({ sent }, "Mattermost blocker-archived DM result");
      }),
    );

    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) {
      log.warn(
        { failed, total: memberCards.size },
        "Some Mattermost blocker-archived DMs failed",
      );
    }
  } catch (error) {
    log.error(
      { err: error, blockerCardId },
      "Failed to send blocker-archived Mattermost notification",
    );
  }
}

/** Max "Confirm unblock" re-reminds sent in a single poller tick. Bounds the
 *  blast radius if many acks become due at once (e.g. after a server restart);
 *  the rest are picked up on subsequent ticks. */
const MAX_UNBLOCK_REMINDS_PER_TICK = 5;

/**
 * Re-send the "Confirm unblock" DM for pending acks that are due (unconfirmed,
 * last reminded over an hour ago, within the reminder cap). Called by the
 * poller each tick — getDueReminders gates the hourly cadence, and the per-tick
 * cap bounds how many fire at once. Returns the count sent.
 */
export async function remindUnconfirmedUnblocks(db: dbClient): Promise<number> {
  const config = getMattermostConfig();
  if (!config) return 0;

  try {
    const due = await unblockAckRepo.getDueReminders(
      db,
      MAX_UNBLOCK_REMINDS_PER_TICK,
    );
    let sent = 0;
    for (const ack of due) {
      try {
        const ok = await sendMattermostDMWithConfirmLink(
          config,
          ack.mattermostUserId,
          ack.messageText,
          ack.publicId,
        );
        if (ok) {
          await unblockAckRepo.markReminded(db, ack.publicId);
          sent++;
        }
      } catch (error) {
        log.error(
          { err: error, publicId: ack.publicId },
          "Failed to re-remind unblock ack",
        );
      }
    }
    // Filled the cap → more may be waiting; they'll fire on later ticks.
    if (due.length >= MAX_UNBLOCK_REMINDS_PER_TICK) {
      log.info(
        { sent, cap: MAX_UNBLOCK_REMINDS_PER_TICK },
        "unblock ack remind hit per-tick cap; remainder deferred to later ticks",
      );
    }
    return sent;
  } catch (error) {
    log.error({ err: error }, "Failed to fetch due unblock ack reminders");
    return 0;
  }
}

export async function getCommenterEmails(
  db: dbClient,
  cardId: number,
  excludeUserId?: string,
): Promise<string[]> {
  const conditions = [eq(comments.cardId, cardId), isNull(comments.deletedAt)];
  if (excludeUserId) {
    conditions.push(ne(comments.createdBy, excludeUserId));
  }

  const result = await db
    .selectDistinct({ email: workspaceMembers.email })
    .from(comments)
    .innerJoin(
      workspaceMembers,
      eq(comments.createdBy, workspaceMembers.userId),
    )
    .where(and(...conditions));

  return result.map((r) => r.email).filter((e): e is string => !!e);
}

export async function sendMattermostNotification(
  db: dbClient,
  cardId: number,
  cardPublicId: string,
  actorUserId: string,
  actorName: string,
  action: string,
  details?: string,
  targetEmail?: string,
  additionalEmails?: string[],
): Promise<void> {
  const config = getMattermostConfig();
  if (!config) return;

  try {
    const fullCard = await cardRepo.getByPublicId(db, cardPublicId);
    const cardTitle = fullCard?.title ?? "Card";

    let memberEmails = targetEmail
      ? [targetEmail]
      : await getCardMemberEmails(db, cardId, actorUserId);

    if (additionalEmails && additionalEmails.length > 0) {
      const combined = new Set([...memberEmails, ...additionalEmails]);
      memberEmails = [...combined];
    }

    if (memberEmails.length === 0) return;

    const baseUrl = env("NEXT_PUBLIC_BASE_URL");
    const cardUrl = `${baseUrl}/cards/${cardPublicId}`;

    let message = `**${actorName}** ${action} on [${cardTitle}](${cardUrl})`;
    if (details) {
      message += `\n> ${details}`;
    }

    const results = await Promise.allSettled(
      memberEmails.map(async (email) => {
        const mmUserId = await getMattermostUserIdByEmail(config, email);
        if (!mmUserId) {
          log.warn(
            { email: redactEmail(email) },
            "Mattermost user not found for email",
          );
          return;
        }
        const sent = await sendMattermostDM(config, mmUserId, message);
        log.info({ sent }, "Mattermost DM result");
      }),
    );

    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) {
      log.warn(
        { failed, total: memberEmails.length },
        "Some Mattermost DMs failed",
      );
    }
  } catch (error) {
    log.error({ err: error, cardId }, "Failed to send Mattermost notification");
  }
}

/** Format a due date for display in a DM (UTC date, locale-stable). */
function formatDueDate(dueDate: Date | null): string {
  if (!dueDate) return "soon";
  return dueDate.toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface CardReminderInput {
  cardPublicId: string;
  cardId: number;
  title: string;
  dueDate: Date | null;
}

/**
 * Send a scheduled card reminder DM to every member of the card. Used by the
 * card-notifications poller at the reminder's computed fire time. The message
 * only references the due date (per product decision — no fire-time details).
 */
export async function sendCardReminderMattermost(
  db: dbClient,
  input: CardReminderInput,
): Promise<void> {
  const config = getMattermostConfig();
  if (!config) return;

  try {
    const memberEmails = await getCardMemberEmails(db, input.cardId);
    if (memberEmails.length === 0) return;

    const baseUrl = env("NEXT_PUBLIC_BASE_URL");
    const cardUrl = `${baseUrl}/cards/${input.cardPublicId}`;
    const message = `🔔 **[${input.title}](${cardUrl})** is due ${formatDueDate(input.dueDate)}`;

    const results = await Promise.allSettled(
      memberEmails.map(async (email) => {
        const mmUserId = await getMattermostUserIdByEmail(config, email);
        if (!mmUserId) {
          log.warn({ email: redactEmail(email) }, "Mattermost user not found for email");
          return;
        }
        await sendMattermostDM(config, mmUserId, message);
      }),
    );

    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) {
      log.warn({ failed, total: memberEmails.length }, "Some reminder DMs failed");
    }
  } catch (error) {
    log.error({ err: error, cardId: input.cardId }, "Failed to send card reminder");
  }
}

interface OverdueNudgeInput {
  cardPublicId: string;
  cardId: number;
  title: string;
  dueDate: Date | null;
  memberEmail: string;
}

/**
 * Send an overdue nudge DM to a SINGLE member (the poller dedups per user per
 * day, so each member is nudged individually). Message references only the due
 * date.
 */
export async function sendOverdueCardMattermost(
  db: dbClient,
  input: OverdueNudgeInput,
): Promise<void> {
  void db; // member already resolved to an email upstream
  const config = getMattermostConfig();
  if (!config) return;

  try {
    const mmUserId = await getMattermostUserIdByEmail(config, input.memberEmail);
    if (!mmUserId) {
      log.warn(
        { email: redactEmail(input.memberEmail) },
        "Mattermost user not found for email",
      );
      return;
    }

    const baseUrl = env("NEXT_PUBLIC_BASE_URL");
    const cardUrl = `${baseUrl}/cards/${input.cardPublicId}`;
    const message = `🔔 **[${input.title}](${cardUrl})** is overdue (was due ${formatDueDate(input.dueDate)})`;

    await sendMattermostDM(config, mmUserId, message);
  } catch (error) {
    log.error(
      { err: error, cardId: input.cardId },
      "Failed to send overdue card nudge",
    );
  }
}
