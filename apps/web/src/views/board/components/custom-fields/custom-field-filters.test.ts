import { describe, expect, it } from "vitest";

import {
  encodeCheckboxFilter,
  encodeSelectFilter,
  parseCustomFieldFilters,
} from "./custom-field-filters";

describe("custom field URL filters", () => {
  it("groups select options by field and removes duplicate tokens", () => {
    const first = encodeSelectFilter("field0000001", "option000001");
    const second = encodeSelectFilter("field0000001", "option000002");

    expect(parseCustomFieldFilters([first, second, first])).toEqual([
      {
        type: "select",
        fieldPublicId: "field0000001",
        optionPublicIds: ["option000001", "option000002"],
      },
    ]);
  });

  it("keeps checkbox states typed and ignores malformed tokens", () => {
    expect(
      parseCustomFieldFilters([
        encodeCheckboxFilter("field0000002", "unchecked"),
        "field0000002:checkbox:invalid",
        "not-a-filter",
      ]),
    ).toEqual([
      {
        type: "checkbox",
        fieldPublicId: "field0000002",
        values: ["unchecked"],
      },
    ]);
  });
});
