import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import * as boardRepo from "@kan/db/repository/board.repo";
import * as cardRepo from "@kan/db/repository/card.repo";
import * as customFieldRepo from "@kan/db/repository/custom-field.repo";
import {
  boards,
  cardCustomFieldValues,
  cards,
  customFields,
  lists,
} from "@kan/db/schema";

import type { TestDbClient } from "./test-db";
import { createTestDb, seedTestData } from "./test-db";

describe("custom field repository integration tests", () => {
  let db: TestDbClient;
  let actorUserId: string;
  let boardPublicId: string;
  let cardPublicId: string;

  beforeEach(async () => {
    db = await createTestDb();
    const { user, workspace } = await seedTestData(db);
    actorUserId = user.id;

    const [board] = await db
      .insert(boards)
      .values({
        publicId: "board0000001",
        name: "Test board",
        slug: "test-board",
        workspaceId: workspace.id,
        createdBy: actorUserId,
      })
      .returning();
    boardPublicId = board!.publicId;

    const [list] = await db
      .insert(lists)
      .values({
        publicId: "list00000001",
        name: "Test list",
        index: 0,
        boardId: board!.id,
        createdBy: actorUserId,
      })
      .returning();

    const [card] = await db
      .insert(cards)
      .values({
        publicId: "card00000001",
        title: "Test card",
        index: 0,
        listId: list!.id,
        createdBy: actorUserId,
      })
      .returning();
    cardPublicId = card!.publicId;
  });

  const createField = (
    type: "text" | "number" | "date" | "checkbox" | "select",
    name = type,
  ) =>
    customFieldRepo.createDefinition(db, {
      boardPublicId,
      name,
      type,
      showOnCard: true,
      actorUserId,
      ...(type === "select"
        ? {
            options: [
              { name: "Low", colourCode: "#00ff00" },
              { name: "High", colourCode: "#ff0000" },
            ],
          }
        : {}),
    });

  it("creates ordered definitions and select options", async () => {
    await createField("text", "Customer");
    await createField("select", "Priority");

    const definitions = await customFieldRepo.listDefinitionsByBoardPublicId(
      db,
      boardPublicId,
    );

    expect(definitions).toMatchObject([
      { name: "Customer", type: "text", position: 0, options: [] },
      {
        name: "Priority",
        type: "select",
        position: 1,
        options: [
          { name: "Low", position: 0, colourCode: "#00ff00" },
          { name: "High", position: 1, colourCode: "#ff0000" },
        ],
      },
    ]);
  });

  it("reorders complete field and option sets atomically", async () => {
    const text = await createField("text", "Customer");
    const select = await createField("select", "Priority");

    await customFieldRepo.reorderDefinitions(db, {
      boardPublicId,
      fieldPublicIds: [select.publicId, text.publicId],
      actorUserId,
    });
    await customFieldRepo.reorderOptions(db, {
      fieldPublicId: select.publicId,
      optionPublicIds: [
        select.options[1]!.publicId,
        select.options[0]!.publicId,
      ],
      actorUserId,
    });

    const definitions = await customFieldRepo.listDefinitionsByBoardPublicId(
      db,
      boardPublicId,
    );
    expect(definitions.map((field) => field.publicId)).toEqual([
      select.publicId,
      text.publicId,
    ]);
    expect(definitions[0]!.options.map((option) => option.name)).toEqual([
      "High",
      "Low",
    ]);

    await expect(
      customFieldRepo.reorderDefinitions(db, {
        boardPublicId,
        fieldPublicIds: [text.publicId],
        actorUserId,
      }),
    ).rejects.toMatchObject({ code: "ORDER_INVALID" });
    expect(
      (
        await customFieldRepo.listDefinitionsByBoardPublicId(db, boardPublicId)
      ).map((field) => field.publicId),
    ).toEqual([select.publicId, text.publicId]);
  });

  it("stores, updates, lists, and clears every supported value type", async () => {
    const text = await createField("text");
    const number = await createField("number");
    const date = await createField("date");
    const checkbox = await createField("checkbox");
    const select = await createField("select");
    const selectedOption = select.options[1]!;
    const selectedDate = new Date("2026-09-04T12:30:00.000Z");

    await customFieldRepo.setCardValue(db, {
      cardPublicId,
      fieldPublicId: text.publicId,
      value: { type: "text", value: "Acme" },
      actorUserId,
    });
    await customFieldRepo.setCardValue(db, {
      cardPublicId,
      fieldPublicId: number.publicId,
      value: { type: "number", value: "13.5" },
      actorUserId,
    });
    await customFieldRepo.setCardValue(db, {
      cardPublicId,
      fieldPublicId: date.publicId,
      value: { type: "date", value: selectedDate },
      actorUserId,
    });
    await customFieldRepo.setCardValue(db, {
      cardPublicId,
      fieldPublicId: checkbox.publicId,
      value: { type: "checkbox", value: false },
      actorUserId,
    });
    await customFieldRepo.setCardValue(db, {
      cardPublicId,
      fieldPublicId: select.publicId,
      value: { type: "select", optionPublicId: selectedOption.publicId },
      actorUserId,
    });

    await customFieldRepo.setCardValue(db, {
      cardPublicId,
      fieldPublicId: text.publicId,
      value: { type: "text", value: "Globex" },
      actorUserId,
    });

    const values = await customFieldRepo.listValuesByCardPublicId(
      db,
      cardPublicId,
    );
    expect(values).toHaveLength(5);
    expect(values).toMatchObject([
      { fieldType: "text", textValue: "Globex" },
      { fieldType: "number", numberValue: "13.5" },
      { fieldType: "date", dateValue: selectedDate },
      { fieldType: "checkbox", checkboxValue: false },
      {
        fieldType: "select",
        optionPublicId: selectedOption.publicId,
        optionName: "High",
      },
    ]);

    expect(
      await customFieldRepo.clearCardValue(db, {
        cardPublicId,
        fieldPublicId: text.publicId,
      }),
    ).toEqual({ cleared: true });
    expect(
      await customFieldRepo.clearCardValue(db, {
        cardPublicId,
        fieldPublicId: text.publicId,
      }),
    ).toEqual({ cleared: false });
  });

  it("rejects mismatched field types and options from another field", async () => {
    const text = await createField("text");
    const firstSelect = await createField("select", "First select");
    const secondSelect = await createField("select", "Second select");

    await expect(
      customFieldRepo.setCardValue(db, {
        cardPublicId,
        fieldPublicId: text.publicId,
        value: { type: "number", value: "1" },
        actorUserId,
      }),
    ).rejects.toMatchObject({ code: "FIELD_TYPE_MISMATCH" });

    await expect(
      customFieldRepo.setCardValue(db, {
        cardPublicId,
        fieldPublicId: firstSelect.publicId,
        value: {
          type: "select",
          optionPublicId: secondSelect.options[0]!.publicId,
        },
        actorUserId,
      }),
    ).rejects.toMatchObject({ code: "OPTION_NOT_FOUND" });
  });

  it("rejects a field from another board", async () => {
    const field = await createField("text");
    const [currentBoard] = await db
      .select({ workspaceId: boards.workspaceId })
      .from(boards)
      .where(eq(boards.publicId, boardPublicId));
    const [otherBoard] = await db
      .insert(boards)
      .values({
        publicId: "board0000002",
        name: "Other board",
        slug: "other-board",
        workspaceId: currentBoard!.workspaceId,
        createdBy: actorUserId,
      })
      .returning();
    const [otherList] = await db
      .insert(lists)
      .values({
        publicId: "list00000002",
        name: "Other list",
        index: 0,
        boardId: otherBoard!.id,
        createdBy: actorUserId,
      })
      .returning();
    const [otherCard] = await db
      .insert(cards)
      .values({
        publicId: "card00000002",
        title: "Other card",
        index: 0,
        listId: otherList!.id,
        createdBy: actorUserId,
      })
      .returning();

    await expect(
      customFieldRepo.setCardValue(db, {
        cardPublicId: otherCard!.publicId,
        fieldPublicId: field.publicId,
        value: { type: "text", value: "Cross-board value" },
        actorUserId,
      }),
    ).rejects.toMatchObject({ code: "FIELD_NOT_FOUND" });
  });

  it("keeps archived option values readable but prevents selecting them", async () => {
    const select = await createField("select");
    const option = select.options[0]!;
    await customFieldRepo.setCardValue(db, {
      cardPublicId,
      fieldPublicId: select.publicId,
      value: { type: "select", optionPublicId: option.publicId },
      actorUserId,
    });

    await customFieldRepo.archiveOption(db, {
      optionPublicId: option.publicId,
      actorUserId,
    });

    const values = await customFieldRepo.listValuesByCardPublicId(
      db,
      cardPublicId,
    );
    expect(values[0]).toMatchObject({
      optionName: "Low",
      optionPublicId: option.publicId,
    });
    expect(values[0]!.optionArchivedAt).toBeInstanceOf(Date);

    await expect(
      customFieldRepo.setCardValue(db, {
        cardPublicId,
        fieldPublicId: select.publicId,
        value: { type: "select", optionPublicId: option.publicId },
        actorUserId,
      }),
    ).rejects.toMatchObject({ code: "OPTION_NOT_FOUND" });
  });

  it("projects definitions and values through the board query", async () => {
    const select = await createField("select", "Priority");
    const option = select.options[0]!;
    await customFieldRepo.setCardValue(db, {
      cardPublicId,
      fieldPublicId: select.publicId,
      value: { type: "select", optionPublicId: option.publicId },
      actorUserId,
    });
    await customFieldRepo.archiveOption(db, {
      optionPublicId: option.publicId,
      actorUserId,
    });

    const board = await boardRepo.getByPublicId(
      db,
      boardPublicId,
      actorUserId,
      {
        members: [],
        labels: [],
        lists: [],
        customFields: [],
        dueDate: [],
        type: "regular",
      },
    );

    expect(board!.customFields[0]).toMatchObject({
      publicId: select.publicId,
      name: "Priority",
    });
    expect(board!.customFields[0]!.options[0]).toMatchObject({
      publicId: option.publicId,
      isArchived: true,
    });
    expect(board!.lists[0]!.cards[0]!.customFieldValues[0]).toMatchObject({
      fieldPublicId: select.publicId,
      optionPublicId: option.publicId,
      optionName: "Low",
      optionArchivedAt: expect.any(Date),
    });

    await db
      .update(boards)
      .set({ visibility: "public" })
      .where(eq(boards.publicId, boardPublicId));
    const [boardScope] = await db
      .select({ workspaceId: boards.workspaceId })
      .from(boards)
      .where(eq(boards.publicId, boardPublicId));
    const publicBoard = await boardRepo.getBySlug(
      db,
      "test-board",
      boardScope!.workspaceId,
      {
        members: [],
        labels: [],
        lists: [],
        customFields: [],
        dueDate: [],
      },
    );
    expect(publicBoard!.customFields[0]!.publicId).toBe(select.publicId);
    expect(
      publicBoard!.lists[0]!.cards[0]!.customFieldValues[0]!.optionPublicId,
    ).toBe(option.publicId);

    const card = await cardRepo.getWithListAndMembersByPublicId(
      db,
      cardPublicId,
    );
    expect(card!.list.board.customFields[0]!.publicId).toBe(select.publicId);
    expect(card!.customFieldValues[0]!.optionPublicId).toBe(option.publicId);

    await customFieldRepo.archiveDefinition(db, {
      fieldPublicId: select.publicId,
      actorUserId,
    });
    const afterArchive = await boardRepo.getByPublicId(
      db,
      boardPublicId,
      actorUserId,
      {
        members: [],
        labels: [],
        lists: [],
        customFields: [],
        dueDate: [],
        type: "regular",
      },
    );
    expect(afterArchive!.customFields).toEqual([]);
    expect(afterArchive!.lists[0]!.cards[0]!.customFieldValues).toEqual([]);
  });

  it("filters cards with OR within a field and AND between fields", async () => {
    const select = await createField("select", "Priority");
    const checkbox = await createField("checkbox", "Approved");
    const [storedBoard] = await db
      .select({ id: boards.id, workspaceId: boards.workspaceId })
      .from(boards)
      .where(eq(boards.publicId, boardPublicId));
    const [list] = await db
      .select({ id: lists.id })
      .from(lists)
      .where(eq(lists.boardId, storedBoard!.id));
    const extraCards = await db
      .insert(cards)
      .values([
        {
          publicId: "card00000002",
          title: "Explicitly unchecked",
          index: 1,
          listId: list!.id,
          createdBy: actorUserId,
        },
        {
          publicId: "card00000003",
          title: "Unset checkbox",
          index: 2,
          listId: list!.id,
          createdBy: actorUserId,
        },
        {
          publicId: "card00000004",
          title: "No custom values",
          index: 3,
          listId: list!.id,
          createdBy: actorUserId,
        },
      ])
      .returning();

    await customFieldRepo.setCardValue(db, {
      cardPublicId,
      fieldPublicId: select.publicId,
      value: { type: "select", optionPublicId: select.options[0]!.publicId },
      actorUserId,
    });
    await customFieldRepo.setCardValue(db, {
      cardPublicId,
      fieldPublicId: checkbox.publicId,
      value: { type: "checkbox", value: true },
      actorUserId,
    });
    await customFieldRepo.setCardValue(db, {
      cardPublicId: extraCards[0]!.publicId,
      fieldPublicId: select.publicId,
      value: { type: "select", optionPublicId: select.options[1]!.publicId },
      actorUserId,
    });
    await customFieldRepo.setCardValue(db, {
      cardPublicId: extraCards[0]!.publicId,
      fieldPublicId: checkbox.publicId,
      value: { type: "checkbox", value: false },
      actorUserId,
    });
    await customFieldRepo.setCardValue(db, {
      cardPublicId: extraCards[1]!.publicId,
      fieldPublicId: select.publicId,
      value: { type: "select", optionPublicId: select.options[0]!.publicId },
      actorUserId,
    });

    const query = (customFields: customFieldRepo.BoardCustomFieldFilter[]) =>
      boardRepo.getByPublicId(db, boardPublicId, actorUserId, {
        members: [],
        labels: [],
        lists: [],
        customFields,
        dueDate: [],
        type: "regular",
      });
    const titles = async (
      customFields: customFieldRepo.BoardCustomFieldFilter[],
    ) =>
      (await query(customFields))!.lists.flatMap((boardList) =>
        boardList.cards.map((card) => card.title),
      );

    await expect(
      titles([
        {
          type: "select",
          fieldPublicId: select.publicId,
          optionPublicIds: select.options.map((option) => option.publicId),
        },
      ]),
    ).resolves.toEqual(["Test card", "Explicitly unchecked", "Unset checkbox"]);
    await expect(
      titles([
        {
          type: "checkbox",
          fieldPublicId: checkbox.publicId,
          values: ["unchecked"],
        },
      ]),
    ).resolves.toEqual([
      "Explicitly unchecked",
      "Unset checkbox",
      "No custom values",
    ]);
    await expect(
      titles([
        {
          type: "select",
          fieldPublicId: select.publicId,
          optionPublicIds: [select.options[0]!.publicId],
        },
        {
          type: "checkbox",
          fieldPublicId: checkbox.publicId,
          values: ["unchecked"],
        },
      ]),
    ).resolves.toEqual(["Unset checkbox"]);
    await expect(
      titles([
        {
          type: "select",
          fieldPublicId: select.publicId,
          optionPublicIds: ["option999999"],
        },
      ]),
    ).resolves.toEqual([]);

    await db
      .update(boards)
      .set({ visibility: "public" })
      .where(eq(boards.publicId, boardPublicId));
    const publicBoard = await boardRepo.getBySlug(
      db,
      "test-board",
      storedBoard!.workspaceId,
      {
        members: [],
        labels: [],
        lists: [],
        customFields: [
          {
            type: "select",
            fieldPublicId: select.publicId,
            optionPublicIds: [select.options[1]!.publicId],
          },
        ],
        dueDate: [],
      },
    );
    expect(
      publicBoard!.lists.flatMap((boardList) =>
        boardList.cards.map((card) => card.title),
      ),
    ).toEqual(["Explicitly unchecked"]);
  });

  it("archives definitions without deleting existing card values", async () => {
    const field = await createField("text");
    await customFieldRepo.setCardValue(db, {
      cardPublicId,
      fieldPublicId: field.publicId,
      value: { type: "text", value: "Preserve me" },
      actorUserId,
    });

    await customFieldRepo.archiveDefinition(db, {
      fieldPublicId: field.publicId,
      actorUserId,
    });

    expect(
      await customFieldRepo.listDefinitionsByBoardPublicId(db, boardPublicId),
    ).toEqual([]);
    expect(
      await customFieldRepo.listValuesByCardPublicId(db, cardPublicId),
    ).toEqual([]);

    const [storedField] = await db
      .select({ id: customFields.id })
      .from(customFields)
      .where(eq(customFields.publicId, field.publicId));
    const storedValues = await db
      .select()
      .from(cardCustomFieldValues)
      .where(eq(cardCustomFieldValues.customFieldId, storedField!.id));
    expect(storedValues).toHaveLength(1);
  });

  it("rejects writes when the board is archived", async () => {
    const field = await createField("select");
    await db
      .update(boards)
      .set({ isArchived: true })
      .where(eq(boards.publicId, boardPublicId));

    await expect(createField("text")).rejects.toMatchObject({
      code: "BOARD_ARCHIVED",
    });
    await expect(
      customFieldRepo.updateDefinition(db, {
        fieldPublicId: field.publicId,
        name: "Renamed",
        actorUserId,
      }),
    ).rejects.toMatchObject({ code: "BOARD_ARCHIVED" });
    await expect(
      customFieldRepo.createOption(db, {
        fieldPublicId: field.publicId,
        name: "Blocked",
        actorUserId,
      }),
    ).rejects.toMatchObject({ code: "BOARD_ARCHIVED" });
    await expect(
      customFieldRepo.setCardValue(db, {
        cardPublicId,
        fieldPublicId: field.publicId,
        value: { type: "select", optionPublicId: field.options[0]!.publicId },
        actorUserId,
      }),
    ).rejects.toMatchObject({ code: "BOARD_ARCHIVED" });
  });

  it("enforces board field and select option limits", async () => {
    const select = await customFieldRepo.createDefinition(db, {
      boardPublicId,
      name: "Full select",
      type: "select",
      showOnCard: true,
      actorUserId,
      options: Array.from(
        { length: customFieldRepo.MAX_CUSTOM_FIELD_OPTIONS },
        (_, index) => ({ name: `Option ${index}` }),
      ),
    });
    const [board] = await db
      .select({ id: boards.id })
      .from(boards)
      .where(eq(boards.publicId, boardPublicId));
    await db.insert(customFields).values(
      Array.from(
        { length: customFieldRepo.MAX_CUSTOM_FIELDS_PER_BOARD - 1 },
        (_, index) => ({
          publicId: `field${index.toString().padStart(7, "0")}`,
          boardId: board!.id,
          name: `Field ${index}`,
          type: "text" as const,
          position: index + 1,
          createdBy: actorUserId,
        }),
      ),
    );

    await expect(createField("text", "One too many")).rejects.toMatchObject({
      code: "FIELD_LIMIT_REACHED",
    });

    await expect(
      customFieldRepo.createOption(db, {
        fieldPublicId: select.publicId,
        name: "One too many",
        actorUserId,
      }),
    ).rejects.toMatchObject({ code: "OPTION_LIMIT_REACHED" });

    await expect(
      customFieldRepo.createDefinition(db, {
        boardPublicId,
        name: "Select",
        type: "select",
        showOnCard: true,
        actorUserId,
        options: Array.from(
          { length: customFieldRepo.MAX_CUSTOM_FIELD_OPTIONS + 1 },
          (_, index) => ({ name: `Option ${index}` }),
        ),
      }),
    ).rejects.toMatchObject({ code: "OPTION_LIMIT_REACHED" });
  });

  it("enforces the typed value shape in the database", async () => {
    const field = await createField("text");
    const [storedField] = await db
      .select({ id: customFields.id })
      .from(customFields)
      .where(eq(customFields.publicId, field.publicId));
    const [card] = await db
      .select({ id: cards.id })
      .from(cards)
      .where(eq(cards.publicId, cardPublicId));

    await expect(
      db.insert(cardCustomFieldValues).values({
        publicId: "badvalue0001",
        cardId: card!.id,
        customFieldId: storedField!.id,
        fieldType: "text",
        textValue: "both are set",
        checkboxValue: true,
        createdBy: actorUserId,
      }),
    ).rejects.toThrow();
  });
});
