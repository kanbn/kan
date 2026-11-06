import { describe, expect, it } from "vitest";

import {
  customFieldDefinitionSchema,
  customFieldFilterTokensSchema,
  parseCustomFieldFilterTokens,
} from "./custom-field";

describe("custom field definitions", () => {
  it("accepts metadata and typed defaults", () => {
    expect(
      customFieldDefinitionSchema.parse({
        publicId: "field0000001",
        name: "Customer",
        description: "Billing account",
        placeholder: "Customer name",
        sectionLabel: "Commercial",
        placement: "main",
        type: "text",
        position: 0,
        showOnCard: true,
        options: [],
        defaultValue: { type: "text", value: "Acme" },
      }),
    ).toMatchObject({
      description: "Billing account",
      placeholder: "Customer name",
      sectionLabel: "Commercial",
      placement: "main",
      defaultValue: { type: "text", value: "Acme" },
    });
  });

  it("rejects overlong metadata", () => {
    const definition = {
      publicId: "field0000001",
      name: "Customer",
      description: null,
      placeholder: "x".repeat(256),
      sectionLabel: null,
      placement: "sidebar",
      type: "text" as const,
      position: 0,
      showOnCard: true,
      options: [],
      defaultValue: null,
    };

    expect(() => customFieldDefinitionSchema.parse(definition)).toThrow();
  });

  it("rejects invalid layout metadata", () => {
    const definition = {
      publicId: "field0000001",
      name: "Customer",
      description: null,
      placeholder: null,
      sectionLabel: "x".repeat(256),
      placement: "footer",
      type: "text" as const,
      position: 0,
      showOnCard: true,
      options: [],
      defaultValue: null,
    };

    expect(() => customFieldDefinitionSchema.parse(definition)).toThrow();
  });
});

describe("custom field filter tokens", () => {
  const encode = (value: string) => Buffer.from(value).toString("base64url");

  it("normalizes a singleton OpenAPI query parameter", () => {
    expect(
      customFieldFilterTokensSchema.parse("field0000001:select:option000001"),
    ).toEqual(["field0000001:select:option000001"]);
  });

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

  it("parses text filters without losing URL-sensitive characters", () => {
    const contains = "  Café: 100%_\\ 🧪 ";

    expect(
      parseCustomFieldFilterTokens([
        `v1:field0000003:text:contains:${encode(contains)}`,
      ]),
    ).toEqual([{ type: "text", fieldPublicId: "field0000003", contains }]);
  });

  it("parses exact numbers and inclusive number ranges", () => {
    expect(
      parseCustomFieldFilterTokens([
        `v1:field0000003:number:eq:${encode(".50")}`,
      ]),
    ).toEqual([
      {
        type: "number",
        fieldPublicId: "field0000003",
        operator: "equals",
        value: ".50",
      },
    ]);
    expect(
      parseCustomFieldFilterTokens([
        `v1:field0000004:number:min:${encode("+2")}`,
        `v1:field0000004:number:max:${encode("1e3")}`,
      ]),
    ).toEqual([
      {
        type: "number",
        fieldPublicId: "field0000004",
        operator: "range",
        min: "+2",
        max: "1e3",
      },
    ]);
  });

  it("parses exclusive dates and inclusive date ranges", () => {
    const before = "2026-09-05T12:30:00.000Z";
    const from = "2026-09-01T00:00:00.000Z";
    const to = "2026-09-30T23:59:59.999Z";

    expect(
      parseCustomFieldFilterTokens([
        `v1:field0000003:date:before:${encode(before)}`,
      ]),
    ).toEqual([
      {
        type: "date",
        fieldPublicId: "field0000003",
        operator: "before",
        value: new Date(before),
      },
    ]);
    expect(
      parseCustomFieldFilterTokens([
        `v1:field0000004:date:from:${encode(from)}`,
        `v1:field0000004:date:to:${encode(to)}`,
      ]),
    ).toEqual([
      {
        type: "date",
        fieldPublicId: "field0000004",
        operator: "range",
        from: new Date(from),
        to: new Date(to),
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
    expect(() =>
      parseCustomFieldFilterTokens([
        `v1:field0000003:number:eq:${encode("1")}`,
        `v1:field0000003:number:min:${encode("0")}`,
      ]),
    ).toThrow();
    expect(() =>
      parseCustomFieldFilterTokens([
        `v1:field0000003:date:before:${encode("2026-09-05T00:00:00.000Z")}`,
        `v1:field0000003:date:after:${encode("2026-09-01T00:00:00.000Z")}`,
      ]),
    ).toThrow();
    expect(() =>
      parseCustomFieldFilterTokens([
        `v1:field0000003:text:contains:${encode("text")}`,
        "field0000003:checkbox:checked",
      ]),
    ).toThrow();
  });

  it("rejects invalid scalar values and encodings", () => {
    expect(() =>
      parseCustomFieldFilterTokens([
        `v1:field0000003:number:eq:${encode("NaN")}`,
      ]),
    ).toThrow();
    expect(() =>
      parseCustomFieldFilterTokens([
        `v1:field0000003:date:before:${encode("2026-02-30T00:00:00.000Z")}`,
      ]),
    ).toThrow();
    expect(() =>
      parseCustomFieldFilterTokens(["v1:field0000003:text:contains:A"]),
    ).toThrow();
  });
});
