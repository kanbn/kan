import type { dbClient } from "@kan/db/client";
import type { WebhookEvent } from "@kan/db/schema";
import * as cardRepo from "@kan/db/repository/card.repo";
import * as memberRepo from "@kan/db/repository/member.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { createLogger } from "@kan/logger";

import {
  buildCardLink,
  createCardWebhookPayload,
  escapeSlack,
  sendWebhooksForWorkspace,
} from "./webhook";

const log = createLogger("slack-notifications");

// Slack-compatible Web API (Slack, SnackCraft). SLACK_BOT_TOKEN needs the
// users:read.email scope; without it people are named instead of tagged.
const slackApiUrl = () =>
  (process.env.SLACK_API_URL ?? "https://slack.projetonucleo.com/api").replace(
    /\/$/,
    "",
  );

const mentionCache = new Map<string, { id: string | null; at: number }>();
const CACHE_MS = 60 * 60 * 1000;

/**
 * Slack tag for a Kan user, matched by email: `<@U123>` when the bot token
 * can find them, otherwise their name in bold.
 */
export async function slackMention(
  email: string | null | undefined,
  name: string,
): Promise<string> {
  const fallback = `*${escapeSlack(name)}*`;
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token || !email) return fallback;

  const key = email.toLowerCase();
  const cached = mentionCache.get(key);
  if (cached && Date.now() - cached.at < CACHE_MS)
    return cached.id ? `<@${cached.id}>` : fallback;

  try {
    const response = await fetch(
      `${slackApiUrl()}/users.lookupByEmail?email=${encodeURIComponent(email)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000),
      },
    );
    const body = (await response.json()) as {
      ok?: boolean;
      user?: { id?: string };
      error?: string;
    };
    const id = body.ok && body.user?.id ? body.user.id : null;
    if (!id) log.info({ error: body.error }, "Slack user not found by email");
    mentionCache.set(key, { id, at: Date.now() });
    return id ? `<@${id}>` : fallback;
  } catch (error) {
    log.error({ err: error }, "Slack user lookup failed");
    return fallback;
  }
}

const displayName = (member: {
  email: string;
  user?: { name?: string | null; email?: string | null } | null;
}) => member.user?.name?.trim() || member.user?.email || member.email;

async function loadCardContext(db: dbClient, cardPublicId: string) {
  const card = await cardRepo.getWithListAndMembersByPublicId(db, cardPublicId);
  if (!card?.list.board) return null;
  const workspace = await workspaceRepo.getByPublicId(
    db,
    card.list.board.workspace.publicId,
  );
  if (!workspace?.id) return null;
  return { card, workspaceId: workspace.id };
}

async function send(
  db: dbClient,
  event: WebhookEvent,
  cardPublicId: string,
  buildText: (ctx: { cardLink: string; where: string }) => Promise<string>,
) {
  const loaded = await loadCardContext(db, cardPublicId);
  if (!loaded) return;
  const { card, workspaceId } = loaded;
  const board = card.list.board;

  const payload = createCardWebhookPayload(
    event,
    {
      id: String(card.id),
      publicId: cardPublicId,
      title: card.title,
      description: card.description,
      dueDate: card.dueDate,
      listId: card.list.publicId,
    },
    {
      boardId: board.publicId,
      boardName: board.name,
      listName: card.list.name,
    },
  );
  payload.text = await buildText({
    cardLink: buildCardLink(cardPublicId, card.title),
    where: `*${escapeSlack(board.name)} › ${escapeSlack(card.list.name)}*`,
  });
  await sendWebhooksForWorkspace(db, workspaceId, payload);
}

/** Tags people in Slack when they become responsible for a card. */
export async function notifyAssigned({
  db,
  cardPublicId,
  workspaceId,
  memberPublicIds,
  assignerUserId,
  assignerName,
}: {
  db: dbClient;
  cardPublicId: string;
  workspaceId: number;
  memberPublicIds: string[];
  assignerUserId: string;
  assignerName: string | null;
}) {
  try {
    if (!memberPublicIds.length) return;
    const members = await memberRepo.getByPublicIdsWithUsers(
      db,
      memberPublicIds,
      workspaceId,
    );
    // No need to tag someone who assigned themselves.
    const others = members.filter((m) => m.user?.id !== assignerUserId);
    if (!others.length) return;

    await send(
      db,
      "card.assigned",
      cardPublicId,
      async ({ cardLink, where }) => {
        const tags = await Promise.all(
          others.map((m) =>
            slackMention(m.user?.email ?? m.email, displayName(m)),
          ),
        );
        return `:bust_in_silhouette: ${tags.join(" ")} ${others.length > 1 ? "agora são responsáveis" : "agora é responsável"} por ${cardLink} em ${where}${assignerName ? ` (por ${escapeSlack(assignerName)})` : ""}`;
      },
    );
  } catch (error) {
    log.error({ err: error, cardPublicId }, "Failed to notify assignment");
  }
}

/** Tags people in Slack when they are @mentioned in a comment or description. */
export async function notifyMentioned({
  db,
  cardPublicId,
  members,
  commenterName,
}: {
  db: dbClient;
  cardPublicId: string;
  members: {
    email: string;
    user?: { name?: string | null; email?: string | null } | null;
  }[];
  commenterName: string;
}) {
  try {
    if (!members.length) return;
    await send(
      db,
      "card.mentioned",
      cardPublicId,
      async ({ cardLink, where }) => {
        const tags = await Promise.all(
          members.map((m) =>
            slackMention(m.user?.email ?? m.email, displayName(m)),
          ),
        );
        return `:speech_balloon: ${escapeSlack(commenterName)} mencionou ${tags.join(" ")} em ${cardLink} (${where})`;
      },
    );
  } catch (error) {
    log.error({ err: error, cardPublicId }, "Failed to notify mention");
  }
}
