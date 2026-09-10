import { enGB, fr } from "date-fns/locale";
import { describe, expect, it } from "vitest";

import { formatCustomFieldDate } from "./custom-field-date";
import { groupCustomFieldDefinitions } from "./custom-field-layout";

describe("custom field date display", () => {
  it("uses the active interface locale", () => {
    const value = new Date(2026, 8, 5, 12, 30);

    expect(formatCustomFieldDate(value, enGB)).toMatch(/^5 Sep 2026.*12:30$/);
    expect(formatCustomFieldDate(value, fr)).toMatch(/^5 sept\. 2026.*12:30$/);
  });
});

describe("custom field layout", () => {
  const definitions = [
    { publicId: "field0000001", placement: "sidebar", sectionLabel: null },
    {
      publicId: "field0000002",
      placement: "main",
      sectionLabel: "Delivery",
    },
    {
      publicId: "field0000003",
      placement: "main",
      sectionLabel: "Delivery",
    },
    {
      publicId: "field0000004",
      placement: "main",
      sectionLabel: "Review",
    },
  ] as const;

  it("groups contiguous fields in definition order for one placement", () => {
    expect(groupCustomFieldDefinitions([...definitions], "main")).toEqual([
      { label: "Delivery", definitions: [definitions[1], definitions[2]] },
      { label: "Review", definitions: [definitions[3]] },
    ]);
  });

  it("omits hidden fields and their empty sections", () => {
    expect(
      groupCustomFieldDefinitions(
        [...definitions],
        "main",
        (definition) => definition.publicId === "field0000004",
      ),
    ).toEqual([{ label: "Review", definitions: [definitions[3]] }]);
  });
});
