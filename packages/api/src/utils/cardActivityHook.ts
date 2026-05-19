import { and, eq, isNull } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import type { ActivityType } from "@kan/db/schema";
import * as cardActivityRepo from "@kan/db/repository/cardActivity.repo";
import {
  cardAttachments,
  cards,
  comments,
  labels,
  lists,
  workspaceMembers,
} from "@kan/db/schema";
import { createLogger } from "@kan/logger";

import type { WebhookPayload } from "./webhook";
import { sendWebhooksForWorkspace } from "./webhook";

const log = createLogger("card-activity-hook");

type ActivityInput = Parameters<typeof cardActivityRepo.create>[1];
type BulkActivityInput = Parameters<typeof cardActivityRepo.bulkCreate>[1][number];

/**
 * Wraps cardActivityRepo.create with fire-and-forget webhook fan-out.
 *
 * Every card_activity row inserted produces a webhook event of the same
 * granular type (e.g. "card.updated.label.added"). Subscribers configured
 * for that exact event in workspace_webhooks receive the payload.
 *
 * "card.created" is intentionally skipped — the card router already fires
 * a coarse "card.created" webhook explicitly at the creation call site, so
 * routing it through here would deliver duplicates. Coarse "card.updated",
 * "card.moved" and "card.deleted" events are likewise still fired from
 * their original explicit dispatch sites for backward compatibility; this
 * hook only adds the granular events on top.
 *
 * Webhook delivery is fire-and-forget and never blocks the activity insert
 * or surfaces errors to callers — failures are logged.
 */
export const createWithWebhook = async (
  db: dbClient,
  input: ActivityInput,
): ReturnType<typeof cardActivityRepo.create> => {
  const result = await cardActivityRepo.create(db, input);

  if (input.type !== "card.created") {
    void deliverGranularWebhook(db, input).catch((err) => {
      log.error(
        { err, type: input.type, cardId: input.cardId },
        "Granular webhook fan-out failed",
      );
    });
  }

  return result;
};

/**
 * Wraps cardActivityRepo.bulkCreate with fire-and-forget webhook fan-out.
 *
 * One webhook per inserted activity row, same dispatch rules as
 * createWithWebhook (skips "card.created").
 */
export const bulkCreateWithWebhook = async (
  db: dbClient,
  inputs: BulkActivityInput[],
): ReturnType<typeof cardActivityRepo.bulkCreate> => {
  const results = await cardActivityRepo.bulkCreate(db, inputs);

  for (const input of inputs) {
    if (input.type === "card.created") continue;
    void deliverGranularWebhook(db, input as ActivityInput).catch((err) => {
      log.error(
        { err, type: input.type, cardId: input.cardId },
        "Granular webhook fan-out failed",
      );
    });
  }

  return results;
};

async function deliverGranularWebhook(
  db: dbClient,
  input: ActivityInput,
): Promise<void> {
  const card = await db.query.cards.findFirst({
    columns: {
      id: true,
      publicId: true,
      title: true,
      description: true,
      dueDate: true,
      listId: true,
    },
    with: {
      list: {
        columns: { publicId: true, name: true, boardId: true },
        with: {
          board: {
            columns: { publicId: true, name: true, workspaceId: true },
          },
        },
      },
    },
    where: and(eq(cards.id, input.cardId), isNull(cards.deletedAt)),
  });

  if (!card?.list?.board) return;

  const workspaceId = card.list.board.workspaceId;

  const payload: WebhookPayload = {
    event: input.type as ActivityType,
    timestamp: new Date().toISOString(),
    data: {
      card: {
        id: String(card.id),
        publicId: card.publicId,
        title: card.title,
        description: card.description,
        dueDate: card.dueDate?.toISOString() ?? null,
        listId: card.list.publicId,
        boardId: card.list.board.publicId,
      },
      board: { id: card.list.board.publicId, name: card.list.board.name },
      list: { id: card.list.publicId, name: card.list.name },
    },
  };

  await hydrateActivityContext(db, input, payload);

  await sendWebhooksForWorkspace(db, workspaceId, payload);
}

async function hydrateActivityContext(
  db: dbClient,
  input: ActivityInput,
  payload: WebhookPayload,
): Promise<void> {
  const lookups: Promise<void>[] = [];

  if (input.labelId !== undefined) {
    lookups.push(
      db.query.labels
        .findFirst({
          columns: { publicId: true, name: true },
          where: eq(labels.id, input.labelId),
        })
        .then((row) => {
          if (row) payload.data.label = { id: row.publicId, name: row.name };
        }),
    );
  }

  if (input.workspaceMemberId !== undefined) {
    lookups.push(
      db.query.workspaceMembers
        .findFirst({
          columns: { publicId: true },
          with: { user: { columns: { name: true } } },
          where: eq(workspaceMembers.id, input.workspaceMemberId),
        })
        .then((row) => {
          if (row)
            payload.data.member = {
              id: row.publicId,
              name: row.user?.name ?? null,
            };
        }),
    );
  }

  if (input.commentId !== undefined) {
    lookups.push(
      db.query.comments
        .findFirst({
          columns: { publicId: true, comment: true },
          where: eq(comments.id, input.commentId),
        })
        .then((row) => {
          if (row)
            payload.data.comment = {
              id: row.publicId,
              body: row.comment ?? null,
            };
        }),
    );
  }

  if (input.attachmentId !== undefined) {
    lookups.push(
      db.query.cardAttachments
        .findFirst({
          columns: { publicId: true, filename: true },
          where: eq(cardAttachments.id, input.attachmentId),
        })
        .then((row) => {
          if (row)
            payload.data.attachment = {
              id: row.publicId,
              filename: row.filename,
            };
        }),
    );
  }

  if (input.fromListId !== undefined) {
    lookups.push(
      db.query.lists
        .findFirst({
          columns: { publicId: true, name: true },
          where: eq(lists.id, input.fromListId),
        })
        .then((row) => {
          if (row) payload.data.fromList = { id: row.publicId, name: row.name };
        }),
    );
  }

  if (input.toListId !== undefined) {
    lookups.push(
      db.query.lists
        .findFirst({
          columns: { publicId: true, name: true },
          where: eq(lists.id, input.toListId),
        })
        .then((row) => {
          if (row) payload.data.toList = { id: row.publicId, name: row.name };
        }),
    );
  }

  if (input.fromDueDate !== undefined || input.toDueDate !== undefined) {
    payload.data.changes = {
      ...(payload.data.changes ?? {}),
      dueDate: {
        from: input.fromDueDate?.toISOString() ?? null,
        to: input.toDueDate?.toISOString() ?? null,
      },
    };
  }

  if (input.fromTitle !== undefined || input.toTitle !== undefined) {
    payload.data.changes = {
      ...(payload.data.changes ?? {}),
      title: { from: input.fromTitle ?? null, to: input.toTitle ?? null },
    };
  }

  if (input.fromDescription !== undefined || input.toDescription !== undefined) {
    payload.data.changes = {
      ...(payload.data.changes ?? {}),
      description: {
        from: input.fromDescription ?? null,
        to: input.toDescription ?? null,
      },
    };
  }

  await Promise.all(lookups);
}
