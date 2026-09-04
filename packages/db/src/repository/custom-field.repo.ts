import { and, asc, count, eq, isNull, max } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import type { CustomFieldType } from "@kan/db/schema";
import {
  boards,
  cardCustomFieldValues,
  cards,
  customFieldOptions,
  customFields,
  lists,
} from "@kan/db/schema";
import { generateUID } from "@kan/shared/utils";

export const MAX_CUSTOM_FIELDS_PER_BOARD = 50;
export const MAX_CUSTOM_FIELD_OPTIONS = 50;

export const customFieldRepositoryErrorCodes = [
  "BOARD_NOT_FOUND",
  "BOARD_ARCHIVED",
  "CARD_NOT_FOUND",
  "FIELD_NOT_FOUND",
  "FIELD_LIMIT_REACHED",
  "OPTION_LIMIT_REACHED",
  "FIELD_TYPE_MISMATCH",
  "FIELD_OPTIONS_INVALID",
  "OPTION_NOT_FOUND",
] as const;

export type CustomFieldRepositoryErrorCode =
  (typeof customFieldRepositoryErrorCodes)[number];

export class CustomFieldRepositoryError extends Error {
  constructor(public readonly code: CustomFieldRepositoryErrorCode) {
    super(code);
    this.name = "CustomFieldRepositoryError";
  }
}

export type CustomFieldValueInput =
  | { type: "text"; value: string }
  | { type: "number"; value: string }
  | { type: "date"; value: Date }
  | { type: "checkbox"; value: boolean }
  | { type: "select"; optionPublicId: string };

interface CreateDefinitionOptionInput {
  name: string;
  colourCode?: string | null;
}

export const listDefinitionsByBoardPublicId = async (
  db: dbClient,
  boardPublicId: string,
) => {
  const board = await db.query.boards.findFirst({
    columns: { id: true },
    where: and(eq(boards.publicId, boardPublicId), isNull(boards.deletedAt)),
  });

  if (!board) return null;

  return db.query.customFields.findMany({
    columns: {
      publicId: true,
      name: true,
      type: true,
      position: true,
      showOnCard: true,
    },
    where: and(
      eq(customFields.boardId, board.id),
      isNull(customFields.deletedAt),
    ),
    orderBy: [asc(customFields.position)],
    with: {
      options: {
        columns: {
          publicId: true,
          name: true,
          colourCode: true,
          position: true,
          deletedAt: true,
        },
        orderBy: [asc(customFieldOptions.position)],
      },
    },
  });
};

export const createDefinition = async (
  db: dbClient,
  input: {
    boardPublicId: string;
    name: string;
    type: CustomFieldType;
    showOnCard: boolean;
    actorUserId: string;
    options?: CreateDefinitionOptionInput[];
  },
) =>
  db.transaction(async (tx) => {
    const [board] = await tx
      .select({ id: boards.id, isArchived: boards.isArchived })
      .from(boards)
      .where(
        and(eq(boards.publicId, input.boardPublicId), isNull(boards.deletedAt)),
      )
      .limit(1)
      .for("update");

    if (!board) throw new CustomFieldRepositoryError("BOARD_NOT_FOUND");
    if (board.isArchived)
      throw new CustomFieldRepositoryError("BOARD_ARCHIVED");

    const options = input.options ?? [];
    if (input.type !== "select" && options.length > 0)
      throw new CustomFieldRepositoryError("FIELD_OPTIONS_INVALID");
    if (options.length > MAX_CUSTOM_FIELD_OPTIONS)
      throw new CustomFieldRepositoryError("OPTION_LIMIT_REACHED");

    const [fieldCount] = await tx
      .select({ value: count() })
      .from(customFields)
      .where(
        and(eq(customFields.boardId, board.id), isNull(customFields.deletedAt)),
      );

    if ((fieldCount?.value ?? 0) >= MAX_CUSTOM_FIELDS_PER_BOARD)
      throw new CustomFieldRepositoryError("FIELD_LIMIT_REACHED");

    const [lastField] = await tx
      .select({ position: max(customFields.position) })
      .from(customFields)
      .where(
        and(eq(customFields.boardId, board.id), isNull(customFields.deletedAt)),
      );

    const [field] = await tx
      .insert(customFields)
      .values({
        publicId: generateUID(),
        boardId: board.id,
        name: input.name,
        type: input.type,
        position: (lastField?.position ?? -1) + 1,
        showOnCard: input.showOnCard,
        createdBy: input.actorUserId,
      })
      .returning({
        id: customFields.id,
        publicId: customFields.publicId,
        name: customFields.name,
        type: customFields.type,
        position: customFields.position,
        showOnCard: customFields.showOnCard,
      });

    if (!field) throw new CustomFieldRepositoryError("FIELD_NOT_FOUND");

    const createdOptions = options.length
      ? await tx
          .insert(customFieldOptions)
          .values(
            options.map((option, position) => ({
              publicId: generateUID(),
              customFieldId: field.id,
              name: option.name,
              colourCode: option.colourCode ?? null,
              position,
              createdBy: input.actorUserId,
            })),
          )
          .returning({
            publicId: customFieldOptions.publicId,
            name: customFieldOptions.name,
            colourCode: customFieldOptions.colourCode,
            position: customFieldOptions.position,
          })
      : [];

    return {
      publicId: field.publicId,
      name: field.name,
      type: field.type,
      position: field.position,
      showOnCard: field.showOnCard,
      options: createdOptions,
    };
  });

const getFieldContext = async (
  db: Pick<dbClient, "select">,
  fieldPublicId: string,
) => {
  const [field] = await db
    .select({
      id: customFields.id,
      type: customFields.type,
      boardArchived: boards.isArchived,
    })
    .from(customFields)
    .innerJoin(boards, eq(customFields.boardId, boards.id))
    .where(
      and(
        eq(customFields.publicId, fieldPublicId),
        isNull(customFields.deletedAt),
        isNull(boards.deletedAt),
      ),
    )
    .limit(1);

  if (!field) throw new CustomFieldRepositoryError("FIELD_NOT_FOUND");
  if (field.boardArchived)
    throw new CustomFieldRepositoryError("BOARD_ARCHIVED");
  return field;
};

export const updateDefinition = async (
  db: dbClient,
  input: {
    fieldPublicId: string;
    name?: string;
    showOnCard?: boolean;
    actorUserId: string;
  },
) =>
  db.transaction(async (tx) => {
    const field = await getFieldContext(tx, input.fieldPublicId);
    const [result] = await tx
      .update(customFields)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.showOnCard !== undefined
          ? { showOnCard: input.showOnCard }
          : {}),
        updatedAt: new Date(),
        updatedBy: input.actorUserId,
      })
      .where(eq(customFields.id, field.id))
      .returning({
        publicId: customFields.publicId,
        name: customFields.name,
        type: customFields.type,
        position: customFields.position,
        showOnCard: customFields.showOnCard,
      });

    if (!result) throw new CustomFieldRepositoryError("FIELD_NOT_FOUND");
    return result;
  });

export const archiveDefinition = async (
  db: dbClient,
  input: { fieldPublicId: string; actorUserId: string },
) =>
  db.transaction(async (tx) => {
    const field = await getFieldContext(tx, input.fieldPublicId);
    const [result] = await tx
      .update(customFields)
      .set({ deletedAt: new Date(), deletedBy: input.actorUserId })
      .where(eq(customFields.id, field.id))
      .returning({ publicId: customFields.publicId });

    if (!result) throw new CustomFieldRepositoryError("FIELD_NOT_FOUND");
    return result;
  });

export const createOption = async (
  db: dbClient,
  input: {
    fieldPublicId: string;
    name: string;
    colourCode?: string | null;
    actorUserId: string;
  },
) =>
  db.transaction(async (tx) => {
    const field = await getFieldContext(tx, input.fieldPublicId);
    if (field.type !== "select")
      throw new CustomFieldRepositoryError("FIELD_TYPE_MISMATCH");

    await tx
      .select({ id: customFields.id })
      .from(customFields)
      .where(eq(customFields.id, field.id))
      .for("update");

    const [optionCount] = await tx
      .select({ value: count() })
      .from(customFieldOptions)
      .where(
        and(
          eq(customFieldOptions.customFieldId, field.id),
          isNull(customFieldOptions.deletedAt),
        ),
      );

    if ((optionCount?.value ?? 0) >= MAX_CUSTOM_FIELD_OPTIONS)
      throw new CustomFieldRepositoryError("OPTION_LIMIT_REACHED");

    const [lastOption] = await tx
      .select({ position: max(customFieldOptions.position) })
      .from(customFieldOptions)
      .where(
        and(
          eq(customFieldOptions.customFieldId, field.id),
          isNull(customFieldOptions.deletedAt),
        ),
      );

    const [result] = await tx
      .insert(customFieldOptions)
      .values({
        publicId: generateUID(),
        customFieldId: field.id,
        name: input.name,
        colourCode: input.colourCode ?? null,
        position: (lastOption?.position ?? -1) + 1,
        createdBy: input.actorUserId,
      })
      .returning({
        publicId: customFieldOptions.publicId,
        name: customFieldOptions.name,
        colourCode: customFieldOptions.colourCode,
        position: customFieldOptions.position,
      });

    if (!result) throw new CustomFieldRepositoryError("OPTION_NOT_FOUND");
    return result;
  });

const getOptionContext = async (
  db: Pick<dbClient, "select">,
  optionPublicId: string,
) => {
  const [option] = await db
    .select({
      id: customFieldOptions.id,
      boardArchived: boards.isArchived,
    })
    .from(customFieldOptions)
    .innerJoin(
      customFields,
      eq(customFieldOptions.customFieldId, customFields.id),
    )
    .innerJoin(boards, eq(customFields.boardId, boards.id))
    .where(
      and(
        eq(customFieldOptions.publicId, optionPublicId),
        isNull(customFieldOptions.deletedAt),
        isNull(customFields.deletedAt),
        isNull(boards.deletedAt),
      ),
    )
    .limit(1);

  if (!option) throw new CustomFieldRepositoryError("OPTION_NOT_FOUND");
  if (option.boardArchived)
    throw new CustomFieldRepositoryError("BOARD_ARCHIVED");
  return option;
};

export const updateOption = async (
  db: dbClient,
  input: {
    optionPublicId: string;
    name?: string;
    colourCode?: string | null;
    actorUserId: string;
  },
) =>
  db.transaction(async (tx) => {
    const option = await getOptionContext(tx, input.optionPublicId);
    const [result] = await tx
      .update(customFieldOptions)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.colourCode !== undefined
          ? { colourCode: input.colourCode }
          : {}),
        updatedAt: new Date(),
        updatedBy: input.actorUserId,
      })
      .where(eq(customFieldOptions.id, option.id))
      .returning({
        publicId: customFieldOptions.publicId,
        name: customFieldOptions.name,
        colourCode: customFieldOptions.colourCode,
        position: customFieldOptions.position,
      });

    if (!result) throw new CustomFieldRepositoryError("OPTION_NOT_FOUND");
    return result;
  });

export const archiveOption = async (
  db: dbClient,
  input: { optionPublicId: string; actorUserId: string },
) =>
  db.transaction(async (tx) => {
    const option = await getOptionContext(tx, input.optionPublicId);
    const [result] = await tx
      .update(customFieldOptions)
      .set({ deletedAt: new Date(), deletedBy: input.actorUserId })
      .where(eq(customFieldOptions.id, option.id))
      .returning({ publicId: customFieldOptions.publicId });

    if (!result) throw new CustomFieldRepositoryError("OPTION_NOT_FOUND");
    return result;
  });

const getCardContext = async (
  db: Pick<dbClient, "select">,
  cardPublicId: string,
) => {
  const [card] = await db
    .select({
      id: cards.id,
      boardId: boards.id,
      boardArchived: boards.isArchived,
    })
    .from(cards)
    .innerJoin(lists, eq(cards.listId, lists.id))
    .innerJoin(boards, eq(lists.boardId, boards.id))
    .where(
      and(
        eq(cards.publicId, cardPublicId),
        isNull(cards.deletedAt),
        isNull(lists.deletedAt),
        isNull(boards.deletedAt),
      ),
    )
    .limit(1);

  if (!card) throw new CustomFieldRepositoryError("CARD_NOT_FOUND");
  return card;
};

export const listValuesByCardPublicId = async (
  db: dbClient,
  cardPublicId: string,
) => {
  const card = await getCardContext(db, cardPublicId);

  return db
    .select({
      publicId: cardCustomFieldValues.publicId,
      fieldPublicId: customFields.publicId,
      fieldType: cardCustomFieldValues.fieldType,
      textValue: cardCustomFieldValues.textValue,
      numberValue: cardCustomFieldValues.numberValue,
      dateValue: cardCustomFieldValues.dateValue,
      checkboxValue: cardCustomFieldValues.checkboxValue,
      optionPublicId: customFieldOptions.publicId,
      optionName: customFieldOptions.name,
      optionColourCode: customFieldOptions.colourCode,
      optionArchivedAt: customFieldOptions.deletedAt,
    })
    .from(cardCustomFieldValues)
    .innerJoin(
      customFields,
      eq(cardCustomFieldValues.customFieldId, customFields.id),
    )
    .leftJoin(
      customFieldOptions,
      eq(cardCustomFieldValues.optionId, customFieldOptions.id),
    )
    .where(
      and(
        eq(cardCustomFieldValues.cardId, card.id),
        eq(customFields.boardId, card.boardId),
        isNull(customFields.deletedAt),
      ),
    )
    .orderBy(asc(customFields.position));
};

export const setCardValue = async (
  db: dbClient,
  input: {
    cardPublicId: string;
    fieldPublicId: string;
    value: CustomFieldValueInput;
    actorUserId: string;
  },
) =>
  db.transaction(async (tx) => {
    const card = await getCardContext(tx, input.cardPublicId);
    if (card.boardArchived)
      throw new CustomFieldRepositoryError("BOARD_ARCHIVED");

    const field = await tx.query.customFields.findFirst({
      columns: { id: true, type: true },
      where: and(
        eq(customFields.publicId, input.fieldPublicId),
        eq(customFields.boardId, card.boardId),
        isNull(customFields.deletedAt),
      ),
    });

    if (!field) throw new CustomFieldRepositoryError("FIELD_NOT_FOUND");
    if (field.type !== input.value.type)
      throw new CustomFieldRepositoryError("FIELD_TYPE_MISMATCH");

    const values: {
      optionId: number | null;
      textValue: string | null;
      numberValue: string | null;
      dateValue: Date | null;
      checkboxValue: boolean | null;
    } = {
      optionId: null,
      textValue: null,
      numberValue: null,
      dateValue: null,
      checkboxValue: null,
    };

    switch (input.value.type) {
      case "text":
        values.textValue = input.value.value;
        break;
      case "number":
        values.numberValue = input.value.value;
        break;
      case "date":
        values.dateValue = input.value.value;
        break;
      case "checkbox":
        values.checkboxValue = input.value.value;
        break;
      case "select": {
        const option = await tx.query.customFieldOptions.findFirst({
          columns: { id: true },
          where: and(
            eq(customFieldOptions.publicId, input.value.optionPublicId),
            eq(customFieldOptions.customFieldId, field.id),
            isNull(customFieldOptions.deletedAt),
          ),
        });
        if (!option) throw new CustomFieldRepositoryError("OPTION_NOT_FOUND");
        values.optionId = option.id;
        break;
      }
    }

    const [result] = await tx
      .insert(cardCustomFieldValues)
      .values({
        publicId: generateUID(),
        cardId: card.id,
        customFieldId: field.id,
        fieldType: field.type,
        ...values,
        createdBy: input.actorUserId,
      })
      .onConflictDoUpdate({
        target: [
          cardCustomFieldValues.cardId,
          cardCustomFieldValues.customFieldId,
        ],
        set: {
          ...values,
          updatedAt: new Date(),
          updatedBy: input.actorUserId,
        },
      })
      .returning({ publicId: cardCustomFieldValues.publicId });

    return result;
  });

export const clearCardValue = async (
  db: dbClient,
  input: { cardPublicId: string; fieldPublicId: string },
) =>
  db.transaction(async (tx) => {
    const card = await getCardContext(tx, input.cardPublicId);
    if (card.boardArchived)
      throw new CustomFieldRepositoryError("BOARD_ARCHIVED");
    const field = await tx.query.customFields.findFirst({
      columns: { id: true },
      where: and(
        eq(customFields.publicId, input.fieldPublicId),
        eq(customFields.boardId, card.boardId),
        isNull(customFields.deletedAt),
      ),
    });

    if (!field) throw new CustomFieldRepositoryError("FIELD_NOT_FOUND");

    const [result] = await tx
      .delete(cardCustomFieldValues)
      .where(
        and(
          eq(cardCustomFieldValues.cardId, card.id),
          eq(cardCustomFieldValues.customFieldId, field.id),
        ),
      )
      .returning({ publicId: cardCustomFieldValues.publicId });

    return { cleared: !!result };
  });
