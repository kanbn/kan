import { and, eq, inArray, isNull } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import type { FieldType } from "@kan/db/schema";
import { customFieldDefinitions, customFieldValues } from "@kan/db/schema";
import { generateUID } from "@kan/shared/utils";

// Custom Field Definitions Repository

export const createFieldDefinition = async (
  db: dbClient,
  definitionInput: {
    name: string;
    description?: string;
    type: FieldType;
    isRequired?: boolean;
    boardId: number;
    createdBy: string;
  },
) => {
  const [definition] = await db
    .insert(customFieldDefinitions)
    .values({
      publicId: generateUID(),
      name: definitionInput.name,
      description: definitionInput.description,
      type: definitionInput.type,
      isRequired: definitionInput.isRequired ?? false,
      boardId: definitionInput.boardId,
      createdBy: definitionInput.createdBy,
    })
    .returning();

  return definition;
};

export const getFieldDefinitionsByBoardId = async (
  db: dbClient,
  boardId: number,
) => {
  return db.query.customFieldDefinitions.findMany({
    where: and(
      eq(customFieldDefinitions.boardId, boardId),
      isNull(customFieldDefinitions.deletedAt),
    ),
    orderBy: customFieldDefinitions.createdAt,
  });
};

export const getFieldDefinitionByPublicId = async (
  db: dbClient,
  publicId: string,
) => {
  return db.query.customFieldDefinitions.findFirst({
    where: and(
      eq(customFieldDefinitions.publicId, publicId),
      isNull(customFieldDefinitions.deletedAt),
    ),
  });
};

export const updateFieldDefinition = async (
  db: dbClient,
  definitionUpdate: {
    publicId: string;
    name?: string;
    description?: string;
    isRequired?: boolean;
  },
) => {
  const [updated] = await db
    .update(customFieldDefinitions)
    .set({
      ...(definitionUpdate.name && { name: definitionUpdate.name }),
      ...(definitionUpdate.description !== undefined && {
        description: definitionUpdate.description,
      }),
      ...(definitionUpdate.isRequired !== undefined && {
        isRequired: definitionUpdate.isRequired,
      }),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(customFieldDefinitions.publicId, definitionUpdate.publicId),
        isNull(customFieldDefinitions.deletedAt),
      ),
    )
    .returning();

  return updated;
};

export const softDeleteFieldDefinition = async (
  db: dbClient,
  deleteInput: {
    publicId: string;
    deletedBy: string;
  },
) => {
  const [deleted] = await db
    .update(customFieldDefinitions)
    .set({
      deletedAt: new Date(),
      deletedBy: deleteInput.deletedBy,
    })
    .where(
      and(
        eq(customFieldDefinitions.publicId, deleteInput.publicId),
        isNull(customFieldDefinitions.deletedAt),
      ),
    )
    .returning();

  return deleted;
};

// Custom Field Values Repository

export const setFieldValue = async (
  db: dbClient,
  valueInput: {
    cardId: number;
    fieldDefinitionId: number;
    value: string | boolean | Date | number | null;
    fieldType: FieldType;
    createdBy: string;
  },
) => {
  // First check if a value already exists for this card and field
  const existingValue = await db.query.customFieldValues.findFirst({
    where: and(
      eq(customFieldValues.cardId, valueInput.cardId),
      eq(customFieldValues.fieldDefinitionId, valueInput.fieldDefinitionId),
      isNull(customFieldValues.deletedAt),
    ),
  });

  const valueColumns = getValueColumns(valueInput.fieldType, valueInput.value);

  if (existingValue) {
    // Update existing value
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Add only the relevant column based on field type
    Object.keys(valueColumns).forEach((key) => {
      updateData[key] = valueColumns[key as keyof typeof valueColumns];
    });

    const [updated] = await db
      .update(customFieldValues)
      .set(updateData)
      .where(eq(customFieldValues.id, existingValue.id))
      .returning();

    return updated;
  } else {
    // Create new value
    const insertData: any = {
      publicId: generateUID(),
      cardId: valueInput.cardId,
      fieldDefinitionId: valueInput.fieldDefinitionId,
      createdBy: valueInput.createdBy,
    };

    // Add only the relevant column based on field type
    Object.keys(valueColumns).forEach((key) => {
      insertData[key] = valueColumns[key as keyof typeof valueColumns];
    });

    const [created] = await db
      .insert(customFieldValues)
      .values(insertData)
      .returning();

    return created;
  }
};

export const getFieldValuesByCardId = async (db: dbClient, cardId: number) => {
  return db.query.customFieldValues.findMany({
    where: and(
      eq(customFieldValues.cardId, cardId),
      isNull(customFieldValues.deletedAt),
    ),
    with: {
      fieldDefinition: true,
      userValue: {
        with: {
          user: {
            columns: {
              id: true,
              email: true,
              name: true,
              image: true,
            },
          },
        },
      },
    },
  });
};

export const getFieldValuesByCardIds = async (
  db: dbClient,
  cardIds: number[],
) => {
  if (cardIds.length === 0) return [];

  return db.query.customFieldValues.findMany({
    where: and(
      inArray(customFieldValues.cardId, cardIds),
      isNull(customFieldValues.deletedAt),
    ),
    with: {
      fieldDefinition: true,
      userValue: {
        with: {
          user: {
            columns: {
              id: true,
              email: true,
              name: true,
              image: true,
            },
          },
        },
      },
    },
  });
};

export const deleteFieldValue = async (
  db: dbClient,
  deleteInput: {
    cardId: number;
    fieldDefinitionId: number;
    deletedBy: string;
  },
) => {
  const [deleted] = await db
    .update(customFieldValues)
    .set({
      deletedAt: new Date(),
      deletedBy: deleteInput.deletedBy,
    })
    .where(
      and(
        eq(customFieldValues.cardId, deleteInput.cardId),
        eq(customFieldValues.fieldDefinitionId, deleteInput.fieldDefinitionId),
        isNull(customFieldValues.deletedAt),
      ),
    )
    .returning();

  return deleted;
};

// Helper function to map field type and value to appropriate columns
function getValueColumns(
  fieldType: FieldType,
  value: string | boolean | Date | number | null,
) {
  const columns: {
    textValue: string | null;
    linkValue: string | null;
    dateValue: Date | null;
    checkboxValue: boolean | null;
    emojiValue: string | null;
    userValue: number | null;
  } = {
    textValue: null,
    linkValue: null,
    dateValue: null,
    checkboxValue: null,
    emojiValue: null,
    userValue: null,
  };

  if (value === null) {
    return columns;
  }

  switch (fieldType) {
    case "text":
      columns.textValue = value as string;
      break;
    case "link":
      columns.linkValue = value as string;
      break;
    case "date":
      columns.dateValue = value as Date;
      break;
    case "checkbox":
      columns.checkboxValue = value as boolean;
      break;
    case "emoji":
      columns.emojiValue = value as string;
      break;
    case "user":
      // For user type, value should be the workspace member ID
      columns.userValue = parseInt(value as string, 10);
      break;
  }

  return columns;
}

// Utility function to extract the actual value from a field value record
export const extractFieldValue = (
  fieldValue: {
    textValue: string | null;
    linkValue: string | null;
    dateValue: Date | null;
    checkboxValue: boolean | null;
    emojiValue: string | null;
    userValue: number | null;
  },
  fieldType: FieldType,
): string | boolean | Date | number | null => {
  switch (fieldType) {
    case "text":
      return fieldValue.textValue;
    case "link":
      return fieldValue.linkValue;
    case "date":
      return fieldValue.dateValue;
    case "checkbox":
      return fieldValue.checkboxValue;
    case "emoji":
      return fieldValue.emojiValue;
    case "user":
      return fieldValue.userValue;
    default:
      return null;
  }
};
