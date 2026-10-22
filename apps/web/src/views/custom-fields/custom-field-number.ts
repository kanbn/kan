const CUSTOM_FIELD_NUMBER_PATTERN =
  /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

export const isValidCustomFieldNumberValue = (value: string) => {
  const normalizedValue = value.trim();
  return (
    normalizedValue.length > 0 &&
    normalizedValue.length <= 100 &&
    CUSTOM_FIELD_NUMBER_PATTERN.test(normalizedValue)
  );
};
