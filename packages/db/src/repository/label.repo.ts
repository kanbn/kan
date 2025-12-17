import { and, count, eq, inArray, isNull } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import { cardsToLabels, labels } from "@kan/db/schema";
import { generateUID } from "@kan/shared/utils";

export const getCount = async (db: dbClient) => {
  const result = await db
    .select({ count: count() })
    .from(labels)
    .where(isNull(labels.deletedAt));

  return result[0]?.count ?? 0;
};

export const create = async (
  db: dbClient,
  labelInput: {
    name: string;
    colourCode: string;
    createdBy: string;
    boardId: number;
    cardId?: number;
  },
) => {
  const [result] = await db
    .insert(labels)
    .values({
      publicId: generateUID(),
      name: labelInput.name,
      colourCode: labelInput.colourCode,
      createdBy: labelInput.createdBy,
      boardId: labelInput.boardId,
    })
    .returning({
      id: labels.id,
      publicId: labels.publicId,
      name: labels.name,
      colourCode: labels.colourCode,
    });

  if (labelInput.cardId && result) {
    await db.insert(cardsToLabels).values({
      cardId: labelInput.cardId,
      labelId: result.id,
    });
  }

  return result;
};

export const bulkCreate = async (
  db: dbClient,
  labelsInput: {
    publicId: string;
    name: string;
    colourCode: string;
    boardId: number;
    createdBy: string;
  }[],
) => {
  const results = await db
    .insert(labels)
    .values(labelsInput)
    .returning({ id: labels.id });

  return results;
};

export const getAllByPublicIds = (db: dbClient, labelPublicIds: string[]) => {
  return db.query.labels.findMany({
    columns: {
      id: true,
    },
    where: inArray(labels.publicId, labelPublicIds),
  });
};

export const getByPublicId = async (db: dbClient, labelPublicId: string) => {
  return db.query.labels.findFirst({
    columns: {
      id: true,
      publicId: true,
      name: true,
      colourCode: true,
    },
    where: eq(labels.publicId, labelPublicId),
  });
};

export const update = async (
  db: dbClient,
  labelInput: {
    labelPublicId: string;
    name: string;
    colourCode: string;
  },
) => {
  const [result] = await db
    .update(labels)
    .set({
      name: labelInput.name,
      colourCode: labelInput.colourCode,
    })
    .where(eq(labels.publicId, labelInput.labelPublicId))
    .returning({
      id: labels.id,
      publicId: labels.publicId,
      name: labels.name,
      colourCode: labels.colourCode,
    });

  return result;
};

export const softDelete = async (
  db: dbClient,
  args: {
    labelId: number;
    deletedAt: Date;
    deletedBy: string;
  },
) => {
  const [result] = await db
    .update(labels)
    .set({
      deletedAt: args.deletedAt,
      deletedBy: args.deletedBy,
    })
    .where(and(eq(labels.id, args.labelId), isNull(labels.deletedAt)))
    .returning({ id: labels.id });

  return result;
};

export const getWorkspaceAndLabelIdByLabelPublicId = async (
  db: dbClient,
  labelPublicId: string,
) => {
  const result = await db.query.labels.findFirst({
    columns: { id: true },
    where: eq(labels.publicId, labelPublicId),
    with: {
      board: {
        columns: { workspaceId: true },
      },
    },
  });

  return result
    ? {
        id: result.id,
        workspaceId: result.board.workspaceId,
      }
    : null;
};
