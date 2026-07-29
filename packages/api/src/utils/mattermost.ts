import type { dbClient } from "@banana/db/client";
import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { env } from "next-runtime-env";

import * as cardRepo from "@banana/db/repository/card.repo";
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
    const blockedCardsResult = await db.execute(sql`
      SELECT DISTINCT c."id", c."publicId", c."title"
      FROM "_checklist_item_blocking" cb
      JOIN "card_checklist_item" cci ON cci."id" = cb."checklistItemId"
      JOIN "card_checklist" ccl ON ccl."id" = cci."checklistId"
      JOIN "card" c ON c."id" = ccl."cardId"
      WHERE cb."blockerCardId" = ${blockerCardId}
        AND c."deletedAt" IS NULL
    `);

    const blockedCards = (blockedCardsResult.rows ?? []) as {
      id: number;
      publicId: string;
      title: string;
    }[];

    if (blockedCards.length === 0) return;

    const baseUrl = env("NEXT_PUBLIC_BASE_URL");
    const blockerUrl = `${baseUrl}/cards/${blockerCardPublicId}`;

    log.info(
      { blockerCardId, blockedCardCount: blockedCards.length, actorUserId },
      "Notifying blocked-card members of completed blocker",
    );

    const targets: {
      email: string;
      cardPublicId: string;
      cardTitle: string;
    }[] = [];
    for (const card of blockedCards) {
      const emails = await getCardMemberEmails(db, card.id);
      for (const email of emails) {
        if (email) {
          targets.push({
            email,
            cardPublicId: card.publicId,
            cardTitle: card.title,
          });
        }
      }
    }

    if (targets.length === 0) return;

    const results = await Promise.allSettled(
      targets.map(async ({ email, cardPublicId, cardTitle }) => {
        const mmUserId = await getMattermostUserIdByEmail(config, email);
        if (!mmUserId) {
          log.warn(
            { email: redactEmail(email) },
            "Mattermost user not found for email",
          );
          return;
        }
        const cardUrl = `${baseUrl}/cards/${cardPublicId}`;
        const message = `**${actorName}** marked a blocker as done: [${blockerTitle}](${blockerUrl}).\nYour card [${cardTitle}](${cardUrl}) may now be unblocked.`;
        const sent = await sendMattermostDM(config, mmUserId, message);
        log.info({ sent }, "Mattermost blocker-done DM result");
      }),
    );

    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) {
      log.warn(
        { failed, total: targets.length },
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
