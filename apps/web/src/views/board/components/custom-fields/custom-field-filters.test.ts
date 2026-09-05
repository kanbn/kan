import { describe, expect, it } from "vitest";

import {
  encodeCheckboxFilter,
  encodeSelectFilter,
} from "./custom-field-filters";

describe("custom field URL filters", () => {
  it("encodes select filters", () => {
    expect(encodeSelectFilter("field0000001", "option000001")).toBe(
      "field0000001:select:option000001",
    );
  });

  it("encodes checkbox filters", () => {
    expect(encodeCheckboxFilter("field0000002", "unchecked")).toBe(
      "field0000002:checkbox:unchecked",
    );
  });
});
