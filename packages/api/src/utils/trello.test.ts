import { describe, expect, it } from "vitest";

import type { TrelloCustomField } from "./trello";
import { formatTrelloCustomFields, getTrelloLabelColour } from "./trello";

describe("getTrelloLabelColour", () => {
  it.each([
    ["green", "#4bce97"],
    ["yellow", "#f5cd47"],
    ["orange", "#fea362"],
    ["red", "#f87168"],
    ["purple", "#9f8fef"],
    ["blue", "#579dff"],
    ["sky", "#6cc3e0"],
    ["lime", "#94c748"],
    ["pink", "#e774bb"],
    ["black", "#8590a2"],
    ["green_dark", "#1f845a"],
    ["yellow_dark", "#946f00"],
    ["orange_dark", "#c25100"],
    ["red_dark", "#c9372c"],
    ["purple_dark", "#6e5dc6"],
    ["blue_dark", "#0c66e4"],
    ["sky_dark", "#227d9b"],
    ["lime_dark", "#5b7f24"],
    ["pink_dark", "#ae4787"],
    ["black_dark", "#626f86"],
    ["green_light", "#baf3db"],
    ["yellow_light", "#f8e6a0"],
    ["orange_light", "#fedec8"],
    ["red_light", "#ffd5d2"],
    ["purple_light", "#dfd8fd"],
    ["blue_light", "#cce0ff"],
    ["sky_light", "#c6edfb"],
    ["lime_light", "#d3f1a7"],
    ["pink_light", "#fdd0ec"],
    ["black_light", "#dcdfe4"],
  ])("maps Trello colour %s to %s", (colour, expected) => {
    expect(getTrelloLabelColour(colour)).toBe(expected);
  });

  it.each([null, undefined, ""])(
    "uses a neutral colour for a colourless Trello label",
    (colour) => {
      expect(getTrelloLabelColour(colour)).toBe("#8590a2");
    },
  );

  it("uses the default Kan colour for an unknown Trello colour", () => {
    expect(getTrelloLabelColour("future_colour")).toBe("#0d9488");
  });
});

describe("formatTrelloCustomFields", () => {
  const fields: TrelloCustomField[] = [
    {
      id: "field-text",
      name: "Dispatch note",
      pos: 20,
      type: "text",
      display: { cardFront: false },
    },
    {
      id: "field-select",
      name: "Route",
      pos: 10,
      type: "list",
      display: { cardFront: true },
      options: [
        {
          id: "option-south",
          idCustomField: "field-select",
          pos: 20,
          color: "red",
          value: { text: "South" },
        },
        {
          id: "option-north",
          idCustomField: "field-select",
          pos: 10,
          color: null,
          value: { text: "North" },
        },
      ],
    },
    {
      id: "field-number",
      name: "Crates",
      pos: 30,
      type: "number",
      display: { cardFront: true },
    },
    {
      id: "field-date",
      name: "Departure",
      pos: 40,
      type: "date",
      display: { cardFront: true },
    },
    {
      id: "field-checkbox",
      name: "Sealed",
      pos: 50,
      type: "checkbox",
      display: { cardFront: false },
    },
  ];

  it("maps definitions, options and every Trello value type", () => {
    const result = formatTrelloCustomFields(fields, [
      {
        id: "card-one",
        customFieldItems: [
          {
            id: "item-text",
            idCustomField: "field-text",
            idModel: "card-one",
            value: { text: "Keep dry" },
          },
          {
            id: "item-select",
            idCustomField: "field-select",
            idModel: "card-one",
            idValue: "option-north",
          },
          {
            id: "item-number",
            idCustomField: "field-number",
            idModel: "card-one",
            value: { number: "13.50" },
          },
          {
            id: "item-date",
            idCustomField: "field-date",
            idModel: "card-one",
            value: { date: "2026-09-05T12:30:00.000Z" },
          },
          {
            id: "item-checkbox",
            idCustomField: "field-checkbox",
            idModel: "card-one",
            value: { checked: "false" },
          },
        ],
      },
    ]);

    expect(result.definitions).toEqual([
      {
        sourceId: "field-select",
        name: "Route",
        type: "select",
        showOnCard: true,
        options: [
          {
            sourceId: "option-north",
            name: "North",
            colourCode: "#8590a2",
          },
          {
            sourceId: "option-south",
            name: "South",
            colourCode: "#f87168",
          },
        ],
      },
      {
        sourceId: "field-text",
        name: "Dispatch note",
        type: "text",
        showOnCard: false,
        options: [],
      },
      {
        sourceId: "field-number",
        name: "Crates",
        type: "number",
        showOnCard: true,
        options: [],
      },
      {
        sourceId: "field-date",
        name: "Departure",
        type: "date",
        showOnCard: true,
        options: [],
      },
      {
        sourceId: "field-checkbox",
        name: "Sealed",
        type: "checkbox",
        showOnCard: false,
        options: [],
      },
    ]);
    expect(result.values).toEqual([
      {
        sourceId: "item-text",
        cardSourceId: "card-one",
        fieldSourceId: "field-text",
        value: { type: "text", value: "Keep dry" },
      },
      {
        sourceId: "item-select",
        cardSourceId: "card-one",
        fieldSourceId: "field-select",
        value: { type: "select", optionSourceId: "option-north" },
      },
      {
        sourceId: "item-number",
        cardSourceId: "card-one",
        fieldSourceId: "field-number",
        value: { type: "number", value: "13.50" },
      },
      {
        sourceId: "item-date",
        cardSourceId: "card-one",
        fieldSourceId: "field-date",
        value: { type: "date", value: new Date("2026-09-05T12:30:00.000Z") },
      },
      {
        sourceId: "item-checkbox",
        cardSourceId: "card-one",
        fieldSourceId: "field-checkbox",
        value: { type: "checkbox", value: false },
      },
    ]);
  });

  it.each([
    [
      "an unknown field",
      {
        id: "item",
        idCustomField: "missing",
        idModel: "card-one",
        value: { text: "Value" },
      },
    ],
    [
      "an unknown selected option",
      {
        id: "item",
        idCustomField: "field-select",
        idModel: "card-one",
        idValue: "missing",
      },
    ],
    [
      "an invalid date value",
      {
        id: "item",
        idCustomField: "field-date",
        idModel: "card-one",
        value: { date: "not-a-date" },
      },
    ],
    [
      "an invalid number value",
      {
        id: "item",
        idCustomField: "field-number",
        idModel: "card-one",
        value: { number: "thirteen" },
      },
    ],
    [
      "an invalid checkbox value",
      {
        id: "item",
        idCustomField: "field-checkbox",
        idModel: "card-one",
        value: { checked: "yes" },
      },
    ],
  ])("rejects an item with %s", (_reason, item) => {
    expect(() =>
      formatTrelloCustomFields(fields, [
        { id: "card-one", customFieldItems: [item] },
      ]),
    ).toThrow(`Invalid Trello custom field item ${item.id}`);
  });

  it("rejects an item attached to another card", () => {
    expect(() =>
      formatTrelloCustomFields(fields, [
        {
          id: "card-one",
          customFieldItems: [
            {
              id: "item",
              idCustomField: "field-text",
              idModel: "card-two",
              value: { text: "Value" },
            },
          ],
        },
      ]),
    ).toThrow("belongs to another card");
  });
});
