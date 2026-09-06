import {
  and,
  asc,
  count,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNull,
  lt,
  lte,
  max,
  or,
} from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import type { CustomFieldType } from "@kan/db/schema";
import {
  boards,
  cardCustomFieldValues,
  cards,
  customFieldDefaultValues,
  customFieldMappings,
  customFieldOptionMappings,
  customFieldOptions,
  customFields,
  lists,
} from "@kan/db/schema";
import { generateUID } from "@kan/shared/utils";

type dbTransaction = Parameters<Parameters<dbClient["transaction"]>[0]>[0];

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
  "FIELD_METADATA_INVALID",
  "FIELD_OPTIONS_INVALID",
  "OPTION_NOT_FOUND",
  "ORDER_INVALID",
  "CROSS_BOARD_COPY_UNSUPPORTED",
  "FIELD_MAPPING_AMBIGUOUS",
  "OPTION_MAPPING_AMBIGUOUS",
  "ARCHIVED_FIELD_MOVE_UNSUPPORTED",
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

interface StoredCustomFieldValue {
  fieldType: CustomFieldType;
  optionId: number | null;
  textValue: string | null;
  numberValue: string | null;
  dateValue: Date | null;
  checkboxValue: boolean | null;
}

const mapStoredValueInput = (
  value: Omit<StoredCustomFieldValue, "optionId"> & {
    optionPublicId: string | null;
  },
): CustomFieldValueInput => {
  switch (value.fieldType) {
    case "text":
      if (value.textValue === null)
        throw new CustomFieldRepositoryError("FIELD_TYPE_MISMATCH");
      return { type: "text", value: value.textValue };
    case "number":
      if (value.numberValue === null)
        throw new CustomFieldRepositoryError("FIELD_TYPE_MISMATCH");
      return { type: "number", value: value.numberValue };
    case "date":
      if (value.dateValue === null)
        throw new CustomFieldRepositoryError("FIELD_TYPE_MISMATCH");
      return { type: "date", value: value.dateValue };
    case "checkbox":
      if (value.checkboxValue === null)
        throw new CustomFieldRepositoryError("FIELD_TYPE_MISMATCH");
      return { type: "checkbox", value: value.checkboxValue };
    case "select":
      if (value.optionPublicId === null)
        throw new CustomFieldRepositoryError("OPTION_NOT_FOUND");
      return { type: "select", optionPublicId: value.optionPublicId };
  }
};

export type BoardCustomFieldFilter =
  | {
      type: "text";
      fieldPublicId: string;
      contains: string;
    }
  | {
      type: "number";
      fieldPublicId: string;
      operator: "equals";
      value: string;
    }
  | {
      type: "number";
      fieldPublicId: string;
      operator: "range";
      min?: string;
      max?: string;
    }
  | {
      type: "date";
      fieldPublicId: string;
      operator: "before" | "after";
      value: Date;
    }
  | {
      type: "date";
      fieldPublicId: string;
      operator: "range";
      from?: Date;
      to?: Date;
    }
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

type ScalarCustomFieldFilter = Extract<
  BoardCustomFieldFilter,
  { type: "text" | "number" | "date" }
>;

const escapeLikePattern = (value: string) =>
  value.replace(/[\\%_]/g, (character) => `\\${character}`);

const getScalarFilterCondition = (filter: ScalarCustomFieldFilter) => {
  const fieldCondition = eq(customFields.publicId, filter.fieldPublicId);

  if (filter.type === "text")
    return and(
      fieldCondition,
      eq(cardCustomFieldValues.fieldType, "text"),
      ilike(
        cardCustomFieldValues.textValue,
        `%${escapeLikePattern(filter.contains)}%`,
      ),
    );

  if (filter.type === "number")
    return and(
      fieldCondition,
      eq(cardCustomFieldValues.fieldType, "number"),
      filter.operator === "equals"
        ? eq(cardCustomFieldValues.numberValue, filter.value)
        : and(
            filter.min === undefined
              ? undefined
              : gte(cardCustomFieldValues.numberValue, filter.min),
            filter.max === undefined
              ? undefined
              : lte(cardCustomFieldValues.numberValue, filter.max),
          ),
    );

  if ("value" in filter)
    return and(
      fieldCondition,
      eq(cardCustomFieldValues.fieldType, "date"),
      filter.operator === "before"
        ? lt(cardCustomFieldValues.dateValue, filter.value)
        : gt(cardCustomFieldValues.dateValue, filter.value),
    );

  return and(
    fieldCondition,
    eq(cardCustomFieldValues.fieldType, "date"),
    filter.from === undefined
      ? undefined
      : gte(cardCustomFieldValues.dateValue, filter.from),
    filter.to === undefined
      ? undefined
      : lte(cardCustomFieldValues.dateValue, filter.to),
  );
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
  const scalarFilters = filters.filter(
    (filter): filter is ScalarCustomFieldFilter =>
      filter.type !== "select" && filter.type !== "checkbox",
  );
  const needsAllBoardCards = checkboxFilters.some((filter) =>
    filter.values.includes("unchecked"),
  );

  const [selectRows, checkedRows, scalarRows, boardRows] = await Promise.all([
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
    scalarFilters.length > 0
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
              isNull(customFields.deletedAt),
              or(...scalarFilters.map(getScalarFilterCondition)),
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
  const scalarMatches = collectByField(scalarRows);
  const allBoardCards = new Set(boardRows.map((row) => row.cardPublicId));
  const matchesByFilter = filters.map((filter) => {
    if (filter.type === "select")
      return selectMatches.get(filter.fieldPublicId) ?? new Set<string>();
    if (filter.type !== "checkbox")
      return scalarMatches.get(filter.fieldPublicId) ?? new Set<string>();

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
      description: customFields.description,
      placeholder: customFields.placeholder,
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
    id: number;
    publicId: string;
    name: string;
    description: string | null;
    placeholder: string | null;
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
    defaultValue: CustomFieldValueInput | null;
  }[] = [];
  const definitionIndexes = new Map<number, number>();

  for (const row of rows) {
    let definitionIndex = definitionIndexes.get(row.id);
    if (definitionIndex === undefined) {
      definitionIndex = definitions.length;
      definitionIndexes.set(row.id, definitionIndex);
      definitions.push({
        id: row.id,
        publicId: row.publicId,
        name: row.name,
        description: row.description,
        placeholder: row.placeholder,
        type: row.type,
        position: row.position,
        showOnCard: row.showOnCard,
        options: [],
        defaultValue: null,
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

  const defaults = await db
    .select({
      customFieldId: customFieldDefaultValues.customFieldId,
      fieldType: customFieldDefaultValues.fieldType,
      textValue: customFieldDefaultValues.textValue,
      numberValue: customFieldDefaultValues.numberValue,
      dateValue: customFieldDefaultValues.dateValue,
      checkboxValue: customFieldDefaultValues.checkboxValue,
      optionPublicId: customFieldOptions.publicId,
    })
    .from(customFieldDefaultValues)
    .innerJoin(
      customFields,
      eq(customFieldDefaultValues.customFieldId, customFields.id),
    )
    .innerJoin(boards, eq(customFields.boardId, boards.id))
    .leftJoin(
      customFieldOptions,
      eq(customFieldDefaultValues.optionId, customFieldOptions.id),
    )
    .where(
      and(
        eq(boards.publicId, boardPublicId),
        isNull(boards.deletedAt),
        isNull(customFields.deletedAt),
      ),
    );
  const definitionsById = new Map(
    definitions.map((definition) => [definition.id, definition]),
  );
  for (const value of defaults) {
    const definition = definitionsById.get(value.customFieldId);
    if (definition) definition.defaultValue = mapStoredValueInput(value);
  }

  return definitions.map(({ id: _id, ...definition }) => definition);
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
    description?: string | null;
    placeholder?: string | null;
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
    if (input.placeholder && input.type !== "text" && input.type !== "number")
      throw new CustomFieldRepositoryError("FIELD_METADATA_INVALID");
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
        description: input.description ?? null,
        placeholder: input.placeholder ?? null,
        type: input.type,
        position: (lastField?.position ?? -1) + 1,
        showOnCard: input.showOnCard,
        createdBy: input.actorUserId,
      })
      .returning({
        id: customFields.id,
        publicId: customFields.publicId,
        name: customFields.name,
        description: customFields.description,
        placeholder: customFields.placeholder,
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
      description: field.description,
      placeholder: field.placeholder,
      type: field.type,
      position: field.position,
      showOnCard: field.showOnCard,
      options: createdOptions,
      defaultValue: null,
    };
  });

const getFieldContext = async (
  db: Pick<dbClient, "select">,
  fieldPublicId: string,
  lockStrength: "share" | "update" = "update",
) => {
  if (lockStrength === "share") {
    const [field] = await db
      .select({
        id: customFields.id,
        type: customFields.type,
        boardId: customFields.boardId,
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
      .limit(1)
      .for("share", { of: customFields });

    if (!field) throw new CustomFieldRepositoryError("FIELD_NOT_FOUND");
    if (field.boardArchived)
      throw new CustomFieldRepositoryError("BOARD_ARCHIVED");
    return field;
  }

  const [fieldScope] = await db
    .select({ id: customFields.id, boardId: customFields.boardId })
    .from(customFields)
    .where(
      and(
        eq(customFields.publicId, fieldPublicId),
        isNull(customFields.deletedAt),
      ),
    )
    .limit(1);
  if (!fieldScope) throw new CustomFieldRepositoryError("FIELD_NOT_FOUND");

  const [board] = await db
    .select({ id: boards.id, isArchived: boards.isArchived })
    .from(boards)
    .where(and(eq(boards.id, fieldScope.boardId), isNull(boards.deletedAt)))
    .limit(1)
    .for("update", { of: boards });
  if (!board) throw new CustomFieldRepositoryError("FIELD_NOT_FOUND");
  if (board.isArchived) throw new CustomFieldRepositoryError("BOARD_ARCHIVED");

  const [field] = await db
    .select({
      id: customFields.id,
      type: customFields.type,
      boardId: customFields.boardId,
    })
    .from(customFields)
    .where(
      and(
        eq(customFields.id, fieldScope.id),
        eq(customFields.boardId, board.id),
        isNull(customFields.deletedAt),
      ),
    )
    .limit(1)
    .for("update", { of: customFields });
  if (!field) throw new CustomFieldRepositoryError("FIELD_NOT_FOUND");
  return field;
};

const resolveValueColumns = async (
  db: dbTransaction,
  field: { id: number; type: CustomFieldType },
  value: CustomFieldValueInput,
): Promise<Omit<StoredCustomFieldValue, "fieldType">> => {
  if (field.type !== value.type)
    throw new CustomFieldRepositoryError("FIELD_TYPE_MISMATCH");

  const columns = {
    optionId: null,
    textValue: null,
    numberValue: null,
    dateValue: null,
    checkboxValue: null,
  } satisfies Omit<StoredCustomFieldValue, "fieldType">;

  switch (value.type) {
    case "text":
      return { ...columns, textValue: value.value };
    case "number":
      return { ...columns, numberValue: value.value };
    case "date":
      return { ...columns, dateValue: value.value };
    case "checkbox":
      return { ...columns, checkboxValue: value.value };
    case "select": {
      const [option] = await db
        .select({ id: customFieldOptions.id })
        .from(customFieldOptions)
        .where(
          and(
            eq(customFieldOptions.publicId, value.optionPublicId),
            eq(customFieldOptions.customFieldId, field.id),
            isNull(customFieldOptions.deletedAt),
          ),
        )
        .limit(1)
        .for("share", { of: customFieldOptions });
      if (!option) throw new CustomFieldRepositoryError("OPTION_NOT_FOUND");
      return { ...columns, optionId: option.id };
    }
  }
};

const getDefaultValue = async (db: dbTransaction, customFieldId: number) => {
  const [value] = await db
    .select({
      fieldType: customFieldDefaultValues.fieldType,
      textValue: customFieldDefaultValues.textValue,
      numberValue: customFieldDefaultValues.numberValue,
      dateValue: customFieldDefaultValues.dateValue,
      checkboxValue: customFieldDefaultValues.checkboxValue,
      optionPublicId: customFieldOptions.publicId,
    })
    .from(customFieldDefaultValues)
    .leftJoin(
      customFieldOptions,
      eq(customFieldDefaultValues.optionId, customFieldOptions.id),
    )
    .where(eq(customFieldDefaultValues.customFieldId, customFieldId))
    .limit(1);

  return value ? mapStoredValueInput(value) : null;
};

const setDefaultValue = async (
  db: dbTransaction,
  field: { id: number; type: CustomFieldType },
  value: CustomFieldValueInput | null,
  actorUserId: string,
) => {
  if (value === null) {
    await db
      .delete(customFieldDefaultValues)
      .where(eq(customFieldDefaultValues.customFieldId, field.id));
    return;
  }

  const columns = await resolveValueColumns(db, field, value);
  await db
    .insert(customFieldDefaultValues)
    .values({
      customFieldId: field.id,
      fieldType: field.type,
      ...columns,
      createdBy: actorUserId,
    })
    .onConflictDoUpdate({
      target: customFieldDefaultValues.customFieldId,
      set: {
        ...columns,
        updatedAt: new Date(),
        updatedBy: actorUserId,
      },
    });
};

export const updateDefinition = async (
  db: dbClient,
  input: {
    fieldPublicId: string;
    name?: string;
    description?: string | null;
    placeholder?: string | null;
    showOnCard?: boolean;
    defaultValue?: CustomFieldValueInput | null;
    actorUserId: string;
  },
) =>
  db.transaction(async (tx) => {
    const field = await getFieldContext(tx, input.fieldPublicId);
    if (input.placeholder && field.type !== "text" && field.type !== "number")
      throw new CustomFieldRepositoryError("FIELD_METADATA_INVALID");
    const [result] = await tx
      .update(customFields)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.placeholder !== undefined
          ? { placeholder: input.placeholder }
          : {}),
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
        description: customFields.description,
        placeholder: customFields.placeholder,
        type: customFields.type,
        position: customFields.position,
        showOnCard: customFields.showOnCard,
      });

    if (!result) throw new CustomFieldRepositoryError("FIELD_NOT_FOUND");
    if (input.defaultValue !== undefined)
      await setDefaultValue(tx, field, input.defaultValue, input.actorUserId);
    return {
      ...result,
      defaultValue: await getDefaultValue(tx, field.id),
    };
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
      )
      .for("update", { of: customFields });
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

const getOptionContext = async (db: dbTransaction, optionPublicId: string) => {
  const [optionScope] = await db
    .select({
      id: customFieldOptions.id,
      fieldPublicId: customFields.publicId,
    })
    .from(customFieldOptions)
    .innerJoin(
      customFields,
      eq(customFieldOptions.customFieldId, customFields.id),
    )
    .where(
      and(
        eq(customFieldOptions.publicId, optionPublicId),
        isNull(customFieldOptions.deletedAt),
        isNull(customFields.deletedAt),
      ),
    )
    .limit(1);

  if (!optionScope) throw new CustomFieldRepositoryError("OPTION_NOT_FOUND");

  await getFieldContext(db, optionScope.fieldPublicId);
  const [option] = await db
    .select({ id: customFieldOptions.id })
    .from(customFieldOptions)
    .where(
      and(
        eq(customFieldOptions.id, optionScope.id),
        isNull(customFieldOptions.deletedAt),
      ),
    )
    .limit(1)
    .for("update", { of: customFieldOptions });

  if (!option) throw new CustomFieldRepositoryError("OPTION_NOT_FOUND");
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
    await tx
      .delete(customFieldDefaultValues)
      .where(eq(customFieldDefaultValues.optionId, option.id));
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

const getMutableCardContext = async (
  db: dbTransaction,
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
    .limit(1)
    .for("share", { of: cards });

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

export const hasCardValues = async (db: dbClient, cardId: number) => {
  const [value] = await db
    .select({ id: cardCustomFieldValues.id })
    .from(cardCustomFieldValues)
    .where(eq(cardCustomFieldValues.cardId, cardId))
    .limit(1);

  return !!value;
};

export const copyActiveCardValues = async (
  db: dbClient,
  input: {
    sourceCardPublicId: string;
    targetCardId: number;
    actorUserId: string;
  },
) =>
  db.transaction(async (tx) => {
    const [sourceCard] = await tx
      .select({ id: cards.id, boardId: lists.boardId })
      .from(cards)
      .innerJoin(lists, eq(cards.listId, lists.id))
      .where(
        and(
          eq(cards.publicId, input.sourceCardPublicId),
          isNull(cards.deletedAt),
          isNull(lists.deletedAt),
        ),
      )
      .limit(1)
      .for("share", { of: cards });
    const [targetCard] = await tx
      .select({ boardId: lists.boardId })
      .from(cards)
      .innerJoin(lists, eq(cards.listId, lists.id))
      .where(
        and(
          eq(cards.id, input.targetCardId),
          isNull(cards.deletedAt),
          isNull(lists.deletedAt),
        ),
      )
      .limit(1)
      .for("share", { of: cards });

    if (!sourceCard || !targetCard)
      throw new CustomFieldRepositoryError("CARD_NOT_FOUND");
    if (sourceCard.boardId !== targetCard.boardId)
      throw new CustomFieldRepositoryError("CROSS_BOARD_COPY_UNSUPPORTED");

    const values = await tx
      .select({
        customFieldId: cardCustomFieldValues.customFieldId,
        fieldType: cardCustomFieldValues.fieldType,
        optionId: cardCustomFieldValues.optionId,
        textValue: cardCustomFieldValues.textValue,
        numberValue: cardCustomFieldValues.numberValue,
        dateValue: cardCustomFieldValues.dateValue,
        checkboxValue: cardCustomFieldValues.checkboxValue,
      })
      .from(cardCustomFieldValues)
      .innerJoin(
        customFields,
        eq(cardCustomFieldValues.customFieldId, customFields.id),
      )
      .where(
        and(
          eq(cardCustomFieldValues.cardId, sourceCard.id),
          isNull(customFields.deletedAt),
        ),
      );

    if (values.length === 0) return { copied: 0 };
    const inserted = await tx
      .insert(cardCustomFieldValues)
      .values(
        values.map((value) => ({
          ...value,
          publicId: generateUID(),
          cardId: input.targetCardId,
          createdBy: input.actorUserId,
        })),
      )
      .returning({ id: cardCustomFieldValues.id });

    return { copied: inserted.length };
  });

export const moveCardValuesToBoard = async (
  db: dbTransaction,
  input: {
    cardId: number;
    targetBoardId: number;
    actorUserId: string;
  },
) => {
  const [card] = await db
    .select({ id: cards.id })
    .from(cards)
    .where(and(eq(cards.id, input.cardId), isNull(cards.deletedAt)))
    .limit(1)
    .for("update", { of: cards });
  if (!card) throw new CustomFieldRepositoryError("CARD_NOT_FOUND");

  const values = await db
    .select({
      id: cardCustomFieldValues.id,
      fieldId: customFields.id,
      fieldName: customFields.name,
      fieldDescription: customFields.description,
      fieldPlaceholder: customFields.placeholder,
      fieldType: customFields.type,
      fieldShowOnCard: customFields.showOnCard,
      fieldDeletedAt: customFields.deletedAt,
      optionId: customFieldOptions.id,
      optionName: customFieldOptions.name,
      optionColourCode: customFieldOptions.colourCode,
      optionDeletedAt: customFieldOptions.deletedAt,
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
    .where(eq(cardCustomFieldValues.cardId, input.cardId))
    .orderBy(asc(customFields.position));

  if (values.length === 0) return;
  if (values.some((value) => value.fieldDeletedAt !== null))
    throw new CustomFieldRepositoryError("ARCHIVED_FIELD_MOVE_UNSUPPORTED");

  const [targetBoard] = await db
    .select({ id: boards.id, isArchived: boards.isArchived })
    .from(boards)
    .where(and(eq(boards.id, input.targetBoardId), isNull(boards.deletedAt)))
    .limit(1)
    .for("update", { of: boards });
  if (!targetBoard) throw new CustomFieldRepositoryError("BOARD_NOT_FOUND");
  if (targetBoard.isArchived)
    throw new CustomFieldRepositoryError("BOARD_ARCHIVED");

  const [targetFieldState] = await db
    .select({
      count: count(customFields.id),
      maxPosition: max(customFields.position),
    })
    .from(customFields)
    .where(
      and(
        eq(customFields.boardId, input.targetBoardId),
        isNull(customFields.deletedAt),
      ),
    );
  let activeFieldCount = targetFieldState?.count ?? 0;
  let nextFieldPosition = (targetFieldState?.maxPosition ?? -1) + 1;

  for (const value of values) {
    const [persistedMapping] = await db
      .select({
        mappingId: customFieldMappings.id,
        id: customFields.id,
        type: customFields.type,
        deletedAt: customFields.deletedAt,
      })
      .from(customFieldMappings)
      .innerJoin(
        customFields,
        eq(customFieldMappings.targetFieldId, customFields.id),
      )
      .where(
        and(
          eq(customFieldMappings.sourceFieldId, value.fieldId),
          eq(customFieldMappings.targetBoardId, input.targetBoardId),
        ),
      )
      .limit(1);

    let targetField =
      persistedMapping?.deletedAt === null
        ? { id: persistedMapping.id, type: persistedMapping.type }
        : undefined;
    let clonedOptionIds: Map<number, number> | undefined;

    if (!targetField) {
      const matchingFields = await db
        .select({ id: customFields.id, type: customFields.type })
        .from(customFields)
        .where(
          and(
            eq(customFields.boardId, input.targetBoardId),
            eq(customFields.name, value.fieldName),
            eq(customFields.type, value.fieldType),
            isNull(customFields.deletedAt),
          ),
        )
        .limit(2);

      if (matchingFields.length > 1)
        throw new CustomFieldRepositoryError("FIELD_MAPPING_AMBIGUOUS");
      targetField = matchingFields[0];

      if (!targetField) {
        if (activeFieldCount >= MAX_CUSTOM_FIELDS_PER_BOARD)
          throw new CustomFieldRepositoryError("FIELD_LIMIT_REACHED");

        [targetField] = await db
          .insert(customFields)
          .values({
            publicId: generateUID(),
            boardId: input.targetBoardId,
            name: value.fieldName,
            description: value.fieldDescription,
            placeholder: value.fieldPlaceholder,
            type: value.fieldType,
            position: nextFieldPosition,
            showOnCard: value.fieldShowOnCard,
            createdBy: input.actorUserId,
          })
          .returning({ id: customFields.id, type: customFields.type });
        if (!targetField) throw new Error("Failed to clone custom field");
        const clonedField = targetField;
        activeFieldCount += 1;
        nextFieldPosition += 1;

        if (value.fieldType === "select") {
          const sourceOptions = await db
            .select({
              id: customFieldOptions.id,
              name: customFieldOptions.name,
              colourCode: customFieldOptions.colourCode,
              position: customFieldOptions.position,
              deletedAt: customFieldOptions.deletedAt,
            })
            .from(customFieldOptions)
            .where(eq(customFieldOptions.customFieldId, value.fieldId))
            .orderBy(asc(customFieldOptions.position));

          if (sourceOptions.length > 0) {
            const insertedOptions = await db
              .insert(customFieldOptions)
              .values(
                sourceOptions.map((option) => ({
                  publicId: generateUID(),
                  customFieldId: clonedField.id,
                  name: option.name,
                  colourCode: option.colourCode,
                  position: option.position,
                  createdBy: input.actorUserId,
                  ...(option.deletedAt
                    ? {
                        deletedAt: new Date(),
                        deletedBy: input.actorUserId,
                      }
                    : {}),
                })),
              )
              .returning({ id: customFieldOptions.id });
            clonedOptionIds = new Map(
              sourceOptions.map((option, index) => {
                const insertedOption = insertedOptions[index];
                if (!insertedOption)
                  throw new Error("Failed to clone custom field option");
                return [option.id, insertedOption.id];
              }),
            );
            await db.insert(customFieldOptionMappings).values(
              sourceOptions.map((option) => {
                const targetOptionId = clonedOptionIds?.get(option.id);
                if (targetOptionId === undefined)
                  throw new Error("Failed to map cloned custom field option");
                return {
                  sourceOptionId: option.id,
                  targetFieldId: clonedField.id,
                  targetOptionId,
                  createdBy: input.actorUserId,
                };
              }),
            );
          }
        }

        const [sourceDefault] = await db
          .select({
            fieldType: customFieldDefaultValues.fieldType,
            optionId: customFieldDefaultValues.optionId,
            textValue: customFieldDefaultValues.textValue,
            numberValue: customFieldDefaultValues.numberValue,
            dateValue: customFieldDefaultValues.dateValue,
            checkboxValue: customFieldDefaultValues.checkboxValue,
          })
          .from(customFieldDefaultValues)
          .where(eq(customFieldDefaultValues.customFieldId, value.fieldId))
          .limit(1);
        if (sourceDefault) {
          const targetDefaultOptionId = sourceDefault.optionId
            ? clonedOptionIds?.get(sourceDefault.optionId)
            : null;
          if (
            sourceDefault.fieldType === "select" &&
            targetDefaultOptionId === undefined
          )
            throw new Error("Failed to clone custom field default option");
          await db.insert(customFieldDefaultValues).values({
            ...sourceDefault,
            customFieldId: clonedField.id,
            optionId: targetDefaultOptionId ?? null,
            createdBy: input.actorUserId,
          });
        }
      }

      if (persistedMapping) {
        await db
          .update(customFieldMappings)
          .set({ targetFieldId: targetField.id })
          .where(eq(customFieldMappings.id, persistedMapping.mappingId));
      } else {
        await db.insert(customFieldMappings).values({
          sourceFieldId: value.fieldId,
          targetBoardId: input.targetBoardId,
          targetFieldId: targetField.id,
          createdBy: input.actorUserId,
        });
      }
    }

    if (targetField.type !== value.fieldType)
      throw new CustomFieldRepositoryError("FIELD_TYPE_MISMATCH");

    let targetOptionId: number | null = null;
    if (value.fieldType === "select") {
      if (value.optionId === null || value.optionName === null)
        throw new CustomFieldRepositoryError("OPTION_NOT_FOUND");
      targetOptionId = clonedOptionIds?.get(value.optionId) ?? null;

      if (targetOptionId === null) {
        const [persistedOptionMapping] = await db
          .select({
            id: customFieldOptions.id,
            deletedAt: customFieldOptions.deletedAt,
          })
          .from(customFieldOptionMappings)
          .innerJoin(
            customFieldOptions,
            eq(customFieldOptionMappings.targetOptionId, customFieldOptions.id),
          )
          .where(
            and(
              eq(customFieldOptionMappings.sourceOptionId, value.optionId),
              eq(customFieldOptionMappings.targetFieldId, targetField.id),
            ),
          )
          .limit(1);
        if (
          persistedOptionMapping &&
          (persistedOptionMapping.deletedAt === null) ===
            (value.optionDeletedAt === null)
        )
          targetOptionId = persistedOptionMapping.id;
      }

      if (targetOptionId === null) {
        const matchingOptions = await db
          .select({
            id: customFieldOptions.id,
            deletedAt: customFieldOptions.deletedAt,
          })
          .from(customFieldOptions)
          .where(
            and(
              eq(customFieldOptions.customFieldId, targetField.id),
              eq(customFieldOptions.name, value.optionName),
            ),
          );
        const sameStateOptions = matchingOptions.filter(
          (option) =>
            (option.deletedAt === null) === (value.optionDeletedAt === null),
        );
        if (sameStateOptions.length > 1)
          throw new CustomFieldRepositoryError("OPTION_MAPPING_AMBIGUOUS");
        targetOptionId = sameStateOptions[0]?.id ?? null;
      }

      if (targetOptionId === null) {
        const [targetOptionState] = await db
          .select({
            count: count(customFieldOptions.id),
            maxPosition: max(customFieldOptions.position),
          })
          .from(customFieldOptions)
          .where(
            and(
              eq(customFieldOptions.customFieldId, targetField.id),
              isNull(customFieldOptions.deletedAt),
            ),
          );
        if (
          value.optionDeletedAt === null &&
          (targetOptionState?.count ?? 0) >= MAX_CUSTOM_FIELD_OPTIONS
        )
          throw new CustomFieldRepositoryError("OPTION_LIMIT_REACHED");

        const [createdOption] = await db
          .insert(customFieldOptions)
          .values({
            publicId: generateUID(),
            customFieldId: targetField.id,
            name: value.optionName,
            colourCode: value.optionColourCode,
            position: (targetOptionState?.maxPosition ?? -1) + 1,
            createdBy: input.actorUserId,
            ...(value.optionDeletedAt
              ? { deletedAt: new Date(), deletedBy: input.actorUserId }
              : {}),
          })
          .returning({ id: customFieldOptions.id });
        if (!createdOption)
          throw new Error("Failed to map custom field option");
        targetOptionId = createdOption.id;
      }

      await db
        .insert(customFieldOptionMappings)
        .values({
          sourceOptionId: value.optionId,
          targetFieldId: targetField.id,
          targetOptionId,
          createdBy: input.actorUserId,
        })
        .onConflictDoUpdate({
          target: [
            customFieldOptionMappings.sourceOptionId,
            customFieldOptionMappings.targetFieldId,
          ],
          set: { targetOptionId },
        });
    }

    await db
      .update(cardCustomFieldValues)
      .set({
        customFieldId: targetField.id,
        fieldType: targetField.type,
        optionId: targetOptionId,
        updatedAt: new Date(),
        updatedBy: input.actorUserId,
      })
      .where(eq(cardCustomFieldValues.id, value.id));
  }
};

export const applyInitialCardValues = async (
  db: dbTransaction,
  input: {
    cardId: number;
    actorUserId: string;
    values: {
      fieldPublicId: string;
      value: CustomFieldValueInput | null;
    }[];
  },
) => {
  const fieldPublicIds = input.values.map((value) => value.fieldPublicId);
  if (new Set(fieldPublicIds).size !== fieldPublicIds.length)
    throw new CustomFieldRepositoryError("FIELD_OPTIONS_INVALID");

  const [card] = await db
    .select({ boardId: lists.boardId })
    .from(cards)
    .innerJoin(lists, eq(cards.listId, lists.id))
    .where(and(eq(cards.id, input.cardId), isNull(cards.deletedAt)))
    .limit(1)
    .for("share", { of: cards });
  if (!card) throw new CustomFieldRepositoryError("CARD_NOT_FOUND");

  const fields = await db
    .select({
      id: customFields.id,
      publicId: customFields.publicId,
      type: customFields.type,
      defaultFieldType: customFieldDefaultValues.fieldType,
      defaultOptionId: customFieldDefaultValues.optionId,
      defaultTextValue: customFieldDefaultValues.textValue,
      defaultNumberValue: customFieldDefaultValues.numberValue,
      defaultDateValue: customFieldDefaultValues.dateValue,
      defaultCheckboxValue: customFieldDefaultValues.checkboxValue,
      defaultOptionDeletedAt: customFieldOptions.deletedAt,
    })
    .from(customFields)
    .leftJoin(
      customFieldDefaultValues,
      eq(customFieldDefaultValues.customFieldId, customFields.id),
    )
    .leftJoin(
      customFieldOptions,
      eq(customFieldDefaultValues.optionId, customFieldOptions.id),
    )
    .where(
      and(
        eq(customFields.boardId, card.boardId),
        isNull(customFields.deletedAt),
      ),
    )
    .for("share", { of: customFields });
  const fieldsByPublicId = new Map(
    fields.map((field) => [field.publicId, field]),
  );
  if (fieldPublicIds.some((publicId) => !fieldsByPublicId.has(publicId)))
    throw new CustomFieldRepositoryError("FIELD_NOT_FOUND");

  const explicitValues = new Map(
    input.values.map((value) => [value.fieldPublicId, value.value]),
  );
  const inserts = [];

  for (const field of fields) {
    const hasExplicitValue = explicitValues.has(field.publicId);
    const explicitValue = explicitValues.get(field.publicId);

    let columns: Omit<StoredCustomFieldValue, "fieldType"> | null = null;
    if (hasExplicitValue) {
      if (explicitValue === null || explicitValue === undefined) continue;
      columns = await resolveValueColumns(db, field, explicitValue);
    } else if (
      field.defaultFieldType !== null &&
      (field.defaultFieldType !== "select" ||
        field.defaultOptionDeletedAt === null)
    ) {
      columns = {
        optionId: field.defaultOptionId,
        textValue: field.defaultTextValue,
        numberValue: field.defaultNumberValue,
        dateValue: field.defaultDateValue,
        checkboxValue: field.defaultCheckboxValue,
      };
    }

    if (columns)
      inserts.push({
        publicId: generateUID(),
        cardId: input.cardId,
        customFieldId: field.id,
        fieldType: field.type,
        ...columns,
        createdBy: input.actorUserId,
      });
  }

  if (inserts.length > 0)
    await db.insert(cardCustomFieldValues).values(inserts);
  return { applied: inserts.length };
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
    const card = await getMutableCardContext(tx, input.cardPublicId);
    if (card.boardArchived)
      throw new CustomFieldRepositoryError("BOARD_ARCHIVED");

    const field = await getFieldContext(tx, input.fieldPublicId, "share");

    if (field.boardId !== card.boardId)
      throw new CustomFieldRepositoryError("FIELD_NOT_FOUND");
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
        const [option] = await tx
          .select({ id: customFieldOptions.id })
          .from(customFieldOptions)
          .where(
            and(
              eq(customFieldOptions.publicId, input.value.optionPublicId),
              eq(customFieldOptions.customFieldId, field.id),
              isNull(customFieldOptions.deletedAt),
            ),
          )
          .limit(1)
          .for("share", { of: customFieldOptions });
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
    const card = await getMutableCardContext(tx, input.cardPublicId);
    if (card.boardArchived)
      throw new CustomFieldRepositoryError("BOARD_ARCHIVED");
    const field = await getFieldContext(tx, input.fieldPublicId, "share");

    if (field.boardId !== card.boardId)
      throw new CustomFieldRepositoryError("FIELD_NOT_FOUND");

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
