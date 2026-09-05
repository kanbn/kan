import { and, count, eq, inArray, isNull, max } from "drizzle-orm";

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

import type { CustomFieldValueInput } from "./custom-field.repo";
import {
  CustomFieldRepositoryError,
  MAX_CUSTOM_FIELD_OPTIONS,
  MAX_CUSTOM_FIELDS_PER_BOARD,
} from "./custom-field.repo";

type CustomFieldImportValueInput =
  | Exclude<CustomFieldValueInput, { type: "select" }>
  | { type: "select"; optionSourceId: string };

interface CustomFieldImportInput {
  boardId: number;
  actorUserId: string;
  importId?: number;
  definitions: {
    sourceId: string;
    name: string;
    type: CustomFieldType;
    showOnCard: boolean;
    options: {
      sourceId: string;
      name: string;
      colourCode: string | null;
    }[];
  }[];
  values: {
    cardId: number;
    fieldSourceId: string;
    value: CustomFieldImportValueInput;
  }[];
}

export const importBoardCustomFields = async (
  db: dbClient,
  input: CustomFieldImportInput,
) =>
  db.transaction(async (tx) => {
    const [board] = await tx
      .select({ id: boards.id, isArchived: boards.isArchived })
      .from(boards)
      .where(and(eq(boards.id, input.boardId), isNull(boards.deletedAt)))
      .limit(1)
      .for("update");

    if (!board) throw new CustomFieldRepositoryError("BOARD_NOT_FOUND");
    if (board.isArchived)
      throw new CustomFieldRepositoryError("BOARD_ARCHIVED");

    const [existingFields] = await tx
      .select({ count: count(), lastPosition: max(customFields.position) })
      .from(customFields)
      .where(
        and(eq(customFields.boardId, board.id), isNull(customFields.deletedAt)),
      );
    if (
      (existingFields?.count ?? 0) + input.definitions.length >
      MAX_CUSTOM_FIELDS_PER_BOARD
    )
      throw new CustomFieldRepositoryError("FIELD_LIMIT_REACHED");

    const fieldsBySourceId = new Map(
      input.definitions.map((field) => [field.sourceId, field]),
    );
    if (fieldsBySourceId.size !== input.definitions.length)
      throw new CustomFieldRepositoryError("FIELD_OPTIONS_INVALID");

    const optionsBySourceId = new Map<
      string,
      CustomFieldImportInput["definitions"][number]["options"][number] & {
        fieldSourceId: string;
      }
    >();
    for (const field of input.definitions) {
      if (
        (field.type !== "select" && field.options.length > 0) ||
        field.options.length > MAX_CUSTOM_FIELD_OPTIONS
      )
        throw new CustomFieldRepositoryError("FIELD_OPTIONS_INVALID");

      for (const option of field.options) {
        if (optionsBySourceId.has(option.sourceId))
          throw new CustomFieldRepositoryError("FIELD_OPTIONS_INVALID");
        optionsBySourceId.set(option.sourceId, {
          ...option,
          fieldSourceId: field.sourceId,
        });
      }
    }

    const valueKeys = input.values.map(
      (value) => `${value.cardId}:${value.fieldSourceId}`,
    );
    if (new Set(valueKeys).size !== valueKeys.length)
      throw new CustomFieldRepositoryError("FIELD_OPTIONS_INVALID");

    const cardIds = [...new Set(input.values.map((value) => value.cardId))];
    if (cardIds.length > 0) {
      const boardCards = await tx
        .select({ id: cards.id })
        .from(cards)
        .innerJoin(lists, eq(cards.listId, lists.id))
        .where(
          and(
            inArray(cards.id, cardIds),
            eq(lists.boardId, board.id),
            isNull(cards.deletedAt),
            isNull(lists.deletedAt),
          ),
        );
      if (boardCards.length !== cardIds.length)
        throw new CustomFieldRepositoryError("CARD_NOT_FOUND");
    }

    if (input.definitions.length === 0) {
      if (input.values.length > 0)
        throw new CustomFieldRepositoryError("FIELD_NOT_FOUND");
      return { definitionsCreated: 0, optionsCreated: 0, valuesCreated: 0 };
    }

    const firstPosition = (existingFields?.lastPosition ?? -1) + 1;
    const fieldsToCreate = input.definitions.map((field, position) => ({
      publicId: generateUID(),
      boardId: board.id,
      name: field.name,
      type: field.type,
      position: firstPosition + position,
      showOnCard: field.showOnCard,
      createdBy: input.actorUserId,
      importId: input.importId,
      sourceId: field.sourceId,
    }));
    const createdFields = await tx
      .insert(customFields)
      .values(fieldsToCreate.map(({ sourceId: _sourceId, ...field }) => field))
      .returning({ id: customFields.id, publicId: customFields.publicId });
    const createdFieldIdsByPublicId = new Map(
      createdFields.map((field) => [field.publicId, field.id]),
    );
    const fieldIdsBySourceId = new Map<string, number>();
    for (const field of fieldsToCreate) {
      const fieldId = createdFieldIdsByPublicId.get(field.publicId);
      if (fieldId === undefined)
        throw new CustomFieldRepositoryError("FIELD_NOT_FOUND");
      fieldIdsBySourceId.set(field.sourceId, fieldId);
    }

    const optionsToCreate = input.definitions.flatMap((field) => {
      const customFieldId = fieldIdsBySourceId.get(field.sourceId);
      if (customFieldId === undefined)
        throw new CustomFieldRepositoryError("FIELD_NOT_FOUND");
      return field.options.map((option, position) => ({
        publicId: generateUID(),
        customFieldId,
        name: option.name,
        colourCode: option.colourCode,
        position,
        createdBy: input.actorUserId,
        importId: input.importId,
        sourceId: option.sourceId,
      }));
    });
    const createdOptions = optionsToCreate.length
      ? await tx
          .insert(customFieldOptions)
          .values(
            optionsToCreate.map(({ sourceId: _sourceId, ...option }) => option),
          )
          .returning({
            id: customFieldOptions.id,
            publicId: customFieldOptions.publicId,
          })
      : [];
    const createdOptionIdsByPublicId = new Map(
      createdOptions.map((option) => [option.publicId, option.id]),
    );
    const optionIdsBySourceId = new Map<string, number>();
    for (const option of optionsToCreate) {
      const optionId = createdOptionIdsByPublicId.get(option.publicId);
      if (optionId === undefined)
        throw new CustomFieldRepositoryError("OPTION_NOT_FOUND");
      optionIdsBySourceId.set(option.sourceId, optionId);
    }

    const valuesToCreate = input.values.map((entry) => {
      const field = fieldsBySourceId.get(entry.fieldSourceId);
      const customFieldId = fieldIdsBySourceId.get(entry.fieldSourceId);
      if (!field || customFieldId === undefined)
        throw new CustomFieldRepositoryError("FIELD_NOT_FOUND");
      if (field.type !== entry.value.type)
        throw new CustomFieldRepositoryError("FIELD_TYPE_MISMATCH");

      const values = {
        optionId: null as number | null,
        textValue: null as string | null,
        numberValue: null as string | null,
        dateValue: null as Date | null,
        checkboxValue: null as boolean | null,
      };
      switch (entry.value.type) {
        case "text":
          values.textValue = entry.value.value;
          break;
        case "number":
          values.numberValue = entry.value.value;
          break;
        case "date":
          values.dateValue = entry.value.value;
          break;
        case "checkbox":
          values.checkboxValue = entry.value.value;
          break;
        case "select": {
          const option = optionsBySourceId.get(entry.value.optionSourceId);
          if (!option || option.fieldSourceId !== entry.fieldSourceId)
            throw new CustomFieldRepositoryError("OPTION_NOT_FOUND");
          values.optionId =
            optionIdsBySourceId.get(entry.value.optionSourceId) ?? null;
          if (values.optionId === null)
            throw new CustomFieldRepositoryError("OPTION_NOT_FOUND");
          break;
        }
      }

      return {
        publicId: generateUID(),
        cardId: entry.cardId,
        customFieldId,
        fieldType: field.type,
        ...values,
        createdBy: input.actorUserId,
        importId: input.importId,
      };
    });

    if (valuesToCreate.length > 0)
      await tx.insert(cardCustomFieldValues).values(valuesToCreate);

    return {
      definitionsCreated: createdFields.length,
      optionsCreated: createdOptions.length,
      valuesCreated: valuesToCreate.length,
    };
  });
