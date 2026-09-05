import { describe, expect, it } from "vitest";

import {
  countCustomFieldFilters,
  decodeScalarFilter,
  encodeCheckboxFilter,
  encodeScalarFilter,
  encodeSelectFilter,
  replaceCustomFieldFilter,
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

  it("round-trips scalar filters without losing exact values", () => {
    const filters = [
      { type: "text", contains: "  Café: 100%_\\ 🧪 " } as const,
      { type: "number", operator: "equals", value: "1e3" } as const,
      {
        type: "number",
        operator: "range",
        min: ".5",
        max: "+20",
      } as const,
      {
        type: "date",
        operator: "before",
        value: "2026-09-05T00:00:00.000Z",
      } as const,
      {
        type: "date",
        operator: "range",
        from: "2026-09-01T00:00:00.000Z",
        to: "2026-09-30T23:59:59.999Z",
      } as const,
    ];

    for (const filter of filters) {
      expect(
        decodeScalarFilter(
          "field0000003",
          encodeScalarFilter("field0000003", filter),
        ),
      ).toEqual(filter);
    }
  });

  it("replaces all tokens for one field and counts fields once", () => {
    const existing = [
      "field0000001:select:option000001",
      "field0000001:select:option000002",
      "field0000002:checkbox:checked",
    ];
    const replacement = encodeScalarFilter("field0000001", {
      type: "number",
      operator: "range",
      min: "10",
      max: "20",
    });
    const updated = replaceCustomFieldFilter(
      existing,
      "field0000001",
      replacement,
    );

    expect(updated).toEqual(["field0000002:checkbox:checked", ...replacement]);
    expect(countCustomFieldFilters(updated)).toBe(2);
  });

  it("returns null for malformed scalar tokens", () => {
    expect(
      decodeScalarFilter("field0000003", [
        "v1:field0000003:text:contains:not+base64",
      ]),
    ).toBeNull();
  });

  it("returns null for conflicting or invalid scalar tokens", () => {
    const equals = encodeScalarFilter("field0000003", {
      type: "number",
      operator: "equals",
      value: "10",
    });
    const range = encodeScalarFilter("field0000003", {
      type: "number",
      operator: "range",
      min: "5",
    });
    expect(
      decodeScalarFilter("field0000003", [...equals, ...range]),
    ).toBeNull();

    const duplicateOperator = [
      ...range,
      ...encodeScalarFilter("field0000003", {
        type: "number",
        operator: "range",
        min: "6",
      }),
    ];
    expect(decodeScalarFilter("field0000003", duplicateOperator)).toBeNull();

    expect(
      decodeScalarFilter("field0000003", [
        "v1:field0000003:date:before:bm90LWEtZGF0ZQ",
      ]),
    ).toBeNull();
  });
});
