import { describe, expect, it } from "vitest";

import { parseCustomFieldFilterTokens } from "./custom-field";

describe("custom field filter tokens", () => {
  it("groups values by field and removes duplicate tokens", () => {
    expect(
      parseCustomFieldFilterTokens([
        "field0000001:select:option000001",
        "field0000001:select:option000002",
        "field0000001:select:option000001",
      ]),
    ).toEqual([
      {
        type: "select",
        fieldPublicId: "field0000001",
        optionPublicIds: ["option000001", "option000002"],
      },
    ]);
  });

  it("parses checkbox values", () => {
    expect(
      parseCustomFieldFilterTokens([
        "field0000002:checkbox:checked",
        "field0000002:checkbox:unchecked",
      ]),
    ).toEqual([
      {
        type: "checkbox",
        fieldPublicId: "field0000002",
        values: ["checked", "unchecked"],
      },
    ]);
  });

  it("rejects malformed and mixed-type filters", () => {
    expect(() => parseCustomFieldFilterTokens(["not-a-filter"])).toThrow();
    expect(() =>
      parseCustomFieldFilterTokens([
        "field0000003:checkbox:checked",
        "field0000003:select:option000001",
      ]),
    ).toThrow();
  });
});
