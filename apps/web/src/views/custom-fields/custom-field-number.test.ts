import { describe, expect, it } from "vitest";

import { isValidCustomFieldNumberValue } from "./custom-field-number";

describe("custom field number validation", () => {
  it.each(["0", "-12.5", ".75", "1.", "+2e3", " 42 "])(
    "accepts %s",
    (value) => {
      expect(isValidCustomFieldNumberValue(value)).toBe(true);
    },
  );

  it.each(["", " ", "1,5", "12px", ".", "1 2", "1".repeat(101)])(
    "rejects %s",
    (value) => {
      expect(isValidCustomFieldNumberValue(value)).toBe(false);
    },
  );
});
