import type { CustomFieldValue } from "~/views/card/components/CustomFieldEditor";

/**
 * Creates a mock CustomFieldValue for field definitions that don't have existing values
 * This ensures all defined custom fields are always displayed in the card view
 */
export const createMockFieldValue = (
  definition: {
    id: number;
    publicId: string;
    name: string;
    type: "text" | "link" | "date" | "checkbox" | "emoji" | "user";
    isRequired: boolean;
  }
): CustomFieldValue => ({
  id: -1, // Mock ID to indicate this is a placeholder
  publicId: `mock-${definition.publicId}`,
  fieldDefinition: definition,
  textValue: null,
  linkValue: null,
  dateValue: null,
  checkboxValue: null,
  emojiValue: null,
  userValue: null,
});

/**
 * Combines field definitions with existing values, creating mock values for missing ones
 */
export const combineFieldDefinitionsWithValues = (
  fieldDefinitions: {
    id: number;
    publicId: string;
    name: string;
    type: "text" | "link" | "date" | "checkbox" | "emoji" | "user";
    isRequired: boolean;
  }[],
  existingValues: CustomFieldValue[] = []
): CustomFieldValue[] => {
  return fieldDefinitions.map((definition) => {
    const existingValue = existingValues.find(
      (value) => value.fieldDefinition.publicId === definition.publicId
    );
    
    return existingValue ?? createMockFieldValue(definition);
  });
};

/**
 * Gets the display value for a custom field based on its type and value
 */
export const getFieldDisplayValue = (
  fieldValue: CustomFieldValue,
  formatters: {
    formatDate: (date: string) => string;
    formatUser: (user: { id: string; name: string | null; email: string; image: string | null }) => JSX.Element;
    formatLink: (link: string) => JSX.Element;
  }
) => {
  const { fieldDefinition } = fieldValue;
  
  switch (fieldDefinition.type) {
    case "text":
      return fieldValue.textValue;
    case "link":
      return fieldValue.linkValue ? formatters.formatLink(fieldValue.linkValue) : null;
    case "date":
      return fieldValue.dateValue ? formatters.formatDate(fieldValue.dateValue) : null;
    case "checkbox":
      return fieldValue.checkboxValue;
    case "emoji":
      return fieldValue.emojiValue;
    case "user":
      return fieldValue.userValue?.user ? formatters.formatUser(fieldValue.userValue.user) : null;
    default:
      return null;
  }
};
