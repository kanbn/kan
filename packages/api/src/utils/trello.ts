const trelloLabelColours: Record<string, string> = {
  green: "#4bce97",
  yellow: "#f5cd47",
  orange: "#fea362",
  red: "#f87168",
  purple: "#9f8fef",
  blue: "#579dff",
  sky: "#6cc3e0",
  lime: "#94c748",
  pink: "#e774bb",
  black: "#8590a2",
  green_dark: "#1f845a",
  yellow_dark: "#946f00",
  orange_dark: "#c25100",
  red_dark: "#c9372c",
  purple_dark: "#6e5dc6",
  blue_dark: "#0c66e4",
  sky_dark: "#227d9b",
  lime_dark: "#5b7f24",
  pink_dark: "#ae4787",
  black_dark: "#626f86",
  green_light: "#baf3db",
  yellow_light: "#f8e6a0",
  orange_light: "#fedec8",
  red_light: "#ffd5d2",
  purple_light: "#dfd8fd",
  blue_light: "#cce0ff",
  sky_light: "#c6edfb",
  lime_light: "#d3f1a7",
  pink_light: "#fdd0ec",
  black_light: "#dcdfe4",
};

const defaultLabelColour = "#0d9488";
const colourlessLabelColour = "#8590a2";

export type TrelloCustomFieldType =
  | "checkbox"
  | "date"
  | "list"
  | "number"
  | "text";

export interface TrelloCustomField {
  id: string;
  name: string;
  pos: number;
  type: TrelloCustomFieldType;
  display: { cardFront: boolean };
  options?: {
    id: string;
    idCustomField: string;
    pos: number;
    color?: string | null;
    value: { text: string };
  }[];
}

export interface TrelloCustomFieldItem {
  id: string;
  idCustomField: string;
  idModel: string;
  idValue?: string;
  value?: {
    checked?: string;
    date?: string;
    number?: string;
    text?: string;
  } | null;
}

export type TrelloCustomFieldValue =
  | { type: "checkbox"; value: boolean }
  | { type: "date"; value: Date }
  | { type: "number"; value: string }
  | { type: "select"; optionSourceId: string }
  | { type: "text"; value: string };

export interface TrelloCustomFieldImport {
  definitions: {
    sourceId: string;
    name: string;
    type: Exclude<TrelloCustomFieldType, "list"> | "select";
    showOnCard: boolean;
    options: {
      sourceId: string;
      name: string;
      colourCode: string;
    }[];
  }[];
  values: {
    sourceId: string;
    cardSourceId: string;
    fieldSourceId: string;
    value: TrelloCustomFieldValue;
  }[];
}

export const getTrelloLabelColour = (colour: string | null | undefined) => {
  if (!colour) return colourlessLabelColour;

  return trelloLabelColours[colour] ?? defaultLabelColour;
};

const invalidCustomFieldItem = (item: TrelloCustomFieldItem, reason: string) =>
  new Error(`Invalid Trello custom field item ${item.id}: ${reason}`);

const customFieldNumberPattern =
  /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

export const formatTrelloCustomFields = (
  fields: TrelloCustomField[],
  cards: { id: string; customFieldItems?: TrelloCustomFieldItem[] }[],
): TrelloCustomFieldImport => {
  const fieldsById = new Map(fields.map((field) => [field.id, field]));
  const cardIds = new Set(cards.map((card) => card.id));

  if (fieldsById.size !== fields.length)
    throw new Error("Trello custom field IDs must be unique");

  const definitions = [...fields]
    .sort((a, b) => a.pos - b.pos)
    .map((field) => {
      const options = [...(field.options ?? [])]
        .sort((a, b) => a.pos - b.pos)
        .map((option) => {
          if (option.idCustomField !== field.id)
            throw new Error(
              `Trello custom field option ${option.id} belongs to another field`,
            );

          return {
            sourceId: option.id,
            name: option.value.text,
            colourCode: getTrelloLabelColour(option.color),
          };
        });

      if (field.type !== "list" && options.length > 0)
        throw new Error(
          `Trello custom field ${field.id} has options but is not a list`,
        );

      return {
        sourceId: field.id,
        name: field.name,
        type: field.type === "list" ? ("select" as const) : field.type,
        showOnCard: field.display.cardFront,
        options,
      };
    });

  const values = cards.flatMap((card) =>
    (card.customFieldItems ?? []).map((item) => {
      if (item.idModel !== card.id || !cardIds.has(item.idModel))
        throw invalidCustomFieldItem(item, "belongs to another card");

      const field = fieldsById.get(item.idCustomField);
      if (!field)
        throw invalidCustomFieldItem(item, "references an unknown field");

      let value: TrelloCustomFieldValue;
      switch (field.type) {
        case "checkbox":
          if (item.value?.checked !== "true" && item.value?.checked !== "false")
            throw invalidCustomFieldItem(item, "has an invalid checkbox value");
          value = {
            type: "checkbox",
            value: item.value.checked === "true",
          };
          break;
        case "date": {
          if (!item.value?.date)
            throw invalidCustomFieldItem(item, "has no date value");
          const date = new Date(item.value.date);
          if (Number.isNaN(date.getTime()))
            throw invalidCustomFieldItem(item, "has an invalid date value");
          value = { type: "date", value: date };
          break;
        }
        case "list": {
          if (!item.idValue)
            throw invalidCustomFieldItem(item, "has no selected option");
          const option = field.options?.find(
            (candidate) => candidate.id === item.idValue,
          );
          if (!option)
            throw invalidCustomFieldItem(
              item,
              "references an unknown selected option",
            );
          value = { type: "select", optionSourceId: option.id };
          break;
        }
        case "number":
          if (
            !item.value?.number ||
            item.value.number.length > 100 ||
            !customFieldNumberPattern.test(item.value.number)
          )
            throw invalidCustomFieldItem(item, "has an invalid number value");
          value = { type: "number", value: item.value.number };
          break;
        case "text":
          if (!item.value?.text)
            throw invalidCustomFieldItem(item, "has no text value");
          value = { type: "text", value: item.value.text };
          break;
      }

      return {
        sourceId: item.id,
        cardSourceId: card.id,
        fieldSourceId: field.id,
        value,
      };
    }),
  );

  const valueKeys = values.map(
    (value) => `${value.cardSourceId}:${value.fieldSourceId}`,
  );
  if (new Set(valueKeys).size !== valueKeys.length)
    throw new Error(
      "Trello cards must not contain duplicate custom field values",
    );

  return { definitions, values };
};
