import type { dbClient } from "@banana/db/client";
import { and, asc, eq, isNotNull, isNull } from "drizzle-orm";

import {
  boards,
  cards,
  cardsToLabels,
  cardToWorkspaceMembers,
  labels,
  lists,
  workspaceMembers,
} from "@banana/db/schema";

export const getCalendarCardsForUser = async (
  db: dbClient,
  args: { userId: string },
) => {
  const rows = await db
    .select({
      publicId: cards.publicId,
      title: cards.title,
      dueDate: cards.dueDate,
      boardPublicId: boards.publicId,
      boardName: boards.name,
      listName: lists.name,
      labelName: labels.name,
      labelColourCode: labels.colourCode,
    })
    .from(cards)
    .innerJoin(
      cardToWorkspaceMembers,
      eq(cards.id, cardToWorkspaceMembers.cardId),
    )
    .innerJoin(
      workspaceMembers,
      eq(cardToWorkspaceMembers.workspaceMemberId, workspaceMembers.id),
    )
    .innerJoin(lists, eq(cards.listId, lists.id))
    .innerJoin(boards, eq(lists.boardId, boards.id))
    .leftJoin(cardsToLabels, eq(cards.id, cardsToLabels.cardId))
    .leftJoin(labels, eq(cardsToLabels.labelId, labels.id))
    .where(
      and(
        eq(workspaceMembers.userId, args.userId),
        eq(workspaceMembers.status, "active"),
        isNull(workspaceMembers.deletedAt),
        isNotNull(cards.dueDate),
        isNull(cards.deletedAt),
        isNull(lists.deletedAt),
        isNull(boards.deletedAt),
      ),
    )
    .orderBy(asc(cards.dueDate), asc(cards.index));

  const cardMap = new Map<
    string,
    {
      publicId: string;
      title: string;
      dueDate: Date | null;
      boardPublicId: string;
      boardName: string;
      listName: string | null;
      labels: { name: string; colourCode: string | null }[];
    }
  >();

  for (const row of rows) {
    if (!cardMap.has(row.publicId)) {
      cardMap.set(row.publicId, {
        publicId: row.publicId,
        title: row.title,
        dueDate: row.dueDate,
        boardPublicId: row.boardPublicId,
        boardName: row.boardName,
        listName: row.listName,
        labels: [],
      });
    }
    if (row.labelName) {
      cardMap.get(row.publicId)!.labels.push({
        name: row.labelName,
        colourCode: row.labelColourCode,
      });
    }
  }

  return Array.from(cardMap.values());
};
