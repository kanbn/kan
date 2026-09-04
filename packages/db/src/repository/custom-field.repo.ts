import { and, asc, count, eq, inArray, isNull, max, or } from "drizzle-orm";

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
  "ORDER_INVALID",
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

export type BoardCustomFieldFilter =
  | {
      type: "select";
      fieldPublicId: string;
      optionPublicIds: string[];
    }
  | {
      type: "checkbox";
      fieldPublicId: string;
      values: ("checked" | "unchecked")[];
    };

export const getCardPublicIdsMatchingFilters = async (
  db: dbClient,
  boardScope: { publicId: string } | { slug: string; workspaceId: number },
  filters: BoardCustomFieldFilter[],
) => {
  if (filters.length === 0) return null;

  const boardCondition =
    "publicId" in boardScope
      ? eq(boards.publicId, boardScope.publicId)
      : and(
          eq(boards.slug, boardScope.slug),
          eq(boards.workspaceId, boardScope.workspaceId),
        );
  const boardConditions = and(
    boardCondition,
    isNull(boards.deletedAt),
    isNull(lists.deletedAt),
    isNull(cards.deletedAt),
  );
  const selectFilters = filters.filter(
    (filter): filter is Extract<BoardCustomFieldFilter, { type: "select" }> =>
      filter.type === "select",
  );
  const checkboxFilters = filters.filter(
    (filter): filter is Extract<BoardCustomFieldFilter, { type: "checkbox" }> =>
      filter.type === "checkbox",
  );
  const needsAllBoardCards = checkboxFilters.some((filter) =>
    filter.values.includes("unchecked"),
  );

  const [selectRows, checkedRows, boardCardRows] = await Promise.all([
    selectFilters.length > 0
      ? db
          .selectDistinct({
            cardPublicId: cards.publicId,
            fieldPublicId: customFields.publicId,
          })
          .from(cards)
          .innerJoin(lists, eq(cards.listId, lists.id))
          .innerJoin(boards, eq(lists.boardId, boards.id))
          .innerJoin(
            cardCustomFieldValues,
            eq(cardCustomFieldValues.cardId, cards.id),
          )
          .innerJoin(
            customFields,
            eq(cardCustomFieldValues.customFieldId, customFields.id),
          )
          .innerJoin(
            customFieldOptions,
            eq(cardCustomFieldValues.optionId, customFieldOptions.id),
          )
          .where(
            and(
              boardConditions,
              eq(cardCustomFieldValues.fieldType, "select"),
              isNull(customFields.deletedAt),
              or(
                ...selectFilters.map((filter) =>
                  and(
                    eq(customFields.publicId, filter.fieldPublicId),
                    inArray(
                      customFieldOptions.publicId,
                      filter.optionPublicIds,
                    ),
                  ),
                ),
              ),
            ),
          )
      : [],
    checkboxFilters.length > 0
      ? db
          .selectDistinct({
            cardPublicId: cards.publicId,
            fieldPublicId: customFields.publicId,
          })
          .from(cards)
          .innerJoin(lists, eq(cards.listId, lists.id))
          .innerJoin(boards, eq(lists.boardId, boards.id))
          .innerJoin(
            cardCustomFieldValues,
            eq(cardCustomFieldValues.cardId, cards.id),
          )
          .innerJoin(
            customFields,
            eq(cardCustomFieldValues.customFieldId, customFields.id),
          )
          .where(
            and(
              boardConditions,
              inArray(
                customFields.publicId,
                checkboxFilters.map((filter) => filter.fieldPublicId),
              ),
              eq(cardCustomFieldValues.fieldType, "checkbox"),
              eq(cardCustomFieldValues.checkboxValue, true),
              isNull(customFields.deletedAt),
            ),
          )
      : [],
    needsAllBoardCards
      ? db
          .select({ cardPublicId: cards.publicId })
          .from(cards)
          .innerJoin(lists, eq(cards.listId, lists.id))
          .innerJoin(boards, eq(lists.boardId, boards.id))
          .where(boardConditions)
      : [],
  ]);

  const collectByField = (
    rows: { cardPublicId: string; fieldPublicId: string }[],
  ) => {
    const result = new Map<string, Set<string>>();
    for (const row of rows) {
      const matches = result.get(row.fieldPublicId) ?? new Set<string>();
      matches.add(row.cardPublicId);
      result.set(row.fieldPublicId, matches);
    }
    return result;
  };
  const selectMatches = collectByField(selectRows);
  const checkedMatches = collectByField(checkedRows);
  const allBoardCards = new Set(boardCardRows.map((row) => row.cardPublicId));
  const matchesByFilter = filters.map((filter) => {
    if (filter.type === "select")
      return selectMatches.get(filter.fieldPublicId) ?? new Set<string>();

    const selectedValues = new Set(filter.values);
    if (selectedValues.size === 2) return allBoardCards;
    const checked = checkedMatches.get(filter.fieldPublicId) ?? new Set();
    if (selectedValues.has("checked")) return checked;
    return new Set([...allBoardCards].filter((cardId) => !checked.has(cardId)));
  });

  const [firstMatches, ...otherMatches] = matchesByFilter;
  return [...(firstMatches ?? [])].filter((cardPublicId) =>
    otherMatches.every((matches) => matches.has(cardPublicId)),
  );
};

interface CreateDefinitionOptionInput {
  name: string;
  colourCode?: string | null;
}

export const listDefinitionsByBoardPublicId = async (
  db: dbClient,
  boardPublicId: string,
) => {
  const rows = await db
    .select({
      id: customFields.id,
      publicId: customFields.publicId,
      name: customFields.name,
      type: customFields.type,
      position: customFields.position,
      showOnCard: customFields.showOnCard,
      optionPublicId: customFieldOptions.publicId,
      optionName: customFieldOptions.name,
      optionColourCode: customFieldOptions.colourCode,
      optionPosition: customFieldOptions.position,
      optionDeletedAt: customFieldOptions.deletedAt,
    })
    .from(customFields)
    .innerJoin(boards, eq(customFields.boardId, boards.id))
    .leftJoin(
      customFieldOptions,
      eq(customFieldOptions.customFieldId, customFields.id),
    )
    .where(
      and(
        eq(boards.publicId, boardPublicId),
        isNull(boards.deletedAt),
        isNull(customFields.deletedAt),
      ),
    )
    .orderBy(asc(customFields.position), asc(customFieldOptions.position));

  const definitions: {
    publicId: string;
    name: string;
    type: CustomFieldType;
    position: number;
    showOnCard: boolean;
    options: {
      publicId: string;
      name: string;
      colourCode: string | null;
      position: number;
      deletedAt: Date | null;
    }[];
  }[] = [];
  const definitionIndexes = new Map<number, number>();

  for (const row of rows) {
    let definitionIndex = definitionIndexes.get(row.id);
    if (definitionIndex === undefined) {
      definitionIndex = definitions.length;
      definitionIndexes.set(row.id, definitionIndex);
      definitions.push({
        publicId: row.publicId,
        name: row.name,
        type: row.type,
        position: row.position,
        showOnCard: row.showOnCard,
        options: [],
      });
    }

    if (
      row.optionPublicId !== null &&
      row.optionName !== null &&
      row.optionPosition !== null
    ) {
      definitions[definitionIndex]?.options.push({
        publicId: row.optionPublicId,
        name: row.optionName,
        colourCode: row.optionColourCode,
        position: row.optionPosition,
        deletedAt: row.optionDeletedAt,
      });
    }
  }

  return definitions;
};

export const getBoardProjection = async (
  db: dbClient,
  boardPublicId: string,
  cardPublicIds: string[],
) => {
  const definitions = await listDefinitionsByBoardPublicId(db, boardPublicId);

  const formattedDefinitions = definitions.map((definition) => ({
    ...definition,
    options: definition.options.map(({ deletedAt, ...option }) => ({
      ...option,
      isArchived: !!deletedAt,
    })),
  }));

  if (definitions.length === 0)
    return { definitions: formattedDefinitions, valuesByCardPublicId: {} };

  const valuesByCardPublicId: Record<
    string,
    {
      publicId: string;
      fieldPublicId: string;
      fieldType: CustomFieldType;
      textValue: string | null;
      numberValue: string | null;
      dateValue: Date | null;
      checkboxValue: boolean | null;
      optionPublicId: string | null;
      optionName: string | null;
      optionColourCode: string | null;
      optionArchivedAt: Date | null;
    }[]
  > = {};

  if (cardPublicIds.length > 0) {
    const values = await db
      .select({
        cardPublicId: cards.publicId,
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
      .innerJoin(cards, eq(cardCustomFieldValues.cardId, cards.id))
      .innerJoin(lists, eq(cards.listId, lists.id))
      .innerJoin(boards, eq(lists.boardId, boards.id))
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
          eq(boards.publicId, boardPublicId),
          inArray(cards.publicId, cardPublicIds),
          isNull(boards.deletedAt),
          isNull(lists.deletedAt),
          isNull(cards.deletedAt),
          isNull(customFields.deletedAt),
        ),
      )
      .orderBy(asc(cards.publicId), asc(customFields.position));

    for (const { cardPublicId, ...value } of values) {
      (valuesByCardPublicId[cardPublicId] ??= []).push(value);
    }
  }

  return {
    definitions: formattedDefinitions,
    valuesByCardPublicId,
  };
};

export const getWorkspaceAndDefinitionIdByPublicId = async (
  db: dbClient,
  fieldPublicId: string,
) => {
  const [field] = await db
    .select({
      id: customFields.id,
      workspaceId: boards.workspaceId,
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

  return field ?? null;
};

export const getWorkspaceAndOptionIdByPublicId = async (
  db: dbClient,
  optionPublicId: string,
) => {
  const [option] = await db
    .select({
      id: customFieldOptions.id,
      workspaceId: boards.workspaceId,
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

  return option ?? null;
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

export const reorderDefinitions = async (
  db: dbClient,
  input: {
    boardPublicId: string;
    fieldPublicIds: string[];
    actorUserId: string;
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

    const fields = await tx
      .select({ id: customFields.id, publicId: customFields.publicId })
      .from(customFields)
      .where(
        and(eq(customFields.boardId, board.id), isNull(customFields.deletedAt)),
      );
    const fieldIdsByPublicId = new Map(
      fields.map((field) => [field.publicId, field.id]),
    );

    if (
      input.fieldPublicIds.length !== fields.length ||
      new Set(input.fieldPublicIds).size !== input.fieldPublicIds.length ||
      input.fieldPublicIds.some(
        (fieldPublicId) => !fieldIdsByPublicId.has(fieldPublicId),
      )
    )
      throw new CustomFieldRepositoryError("ORDER_INVALID");

    for (const [position, fieldPublicId] of input.fieldPublicIds.entries()) {
      const fieldId = fieldIdsByPublicId.get(fieldPublicId);
      if (fieldId === undefined)
        throw new CustomFieldRepositoryError("ORDER_INVALID");
      await tx
        .update(customFields)
        .set({ position, updatedAt: new Date(), updatedBy: input.actorUserId })
        .where(eq(customFields.id, fieldId));
    }

    return { success: true };
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

export const reorderOptions = async (
  db: dbClient,
  input: {
    fieldPublicId: string;
    optionPublicIds: string[];
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

    const options = await tx
      .select({
        id: customFieldOptions.id,
        publicId: customFieldOptions.publicId,
      })
      .from(customFieldOptions)
      .where(
        and(
          eq(customFieldOptions.customFieldId, field.id),
          isNull(customFieldOptions.deletedAt),
        ),
      );
    const optionIdsByPublicId = new Map(
      options.map((option) => [option.publicId, option.id]),
    );

    if (
      input.optionPublicIds.length !== options.length ||
      new Set(input.optionPublicIds).size !== input.optionPublicIds.length ||
      input.optionPublicIds.some(
        (optionPublicId) => !optionIdsByPublicId.has(optionPublicId),
      )
    )
      throw new CustomFieldRepositoryError("ORDER_INVALID");

    for (const [position, optionPublicId] of input.optionPublicIds.entries()) {
      const optionId = optionIdsByPublicId.get(optionPublicId);
      if (optionId === undefined)
        throw new CustomFieldRepositoryError("ORDER_INVALID");
      await tx
        .update(customFieldOptions)
        .set({ position, updatedAt: new Date(), updatedBy: input.actorUserId })
        .where(eq(customFieldOptions.id, optionId));
    }

    return { success: true };
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

    if (!result) throw new CustomFieldRepositoryError("FIELD_NOT_FOUND");

    const [storedValue] = await tx
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
      .where(eq(cardCustomFieldValues.publicId, result.publicId))
      .limit(1);

    if (!storedValue) throw new CustomFieldRepositoryError("FIELD_NOT_FOUND");
    return storedValue;
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
