import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import * as boardRepo from "@kan/db/repository/board.repo";
import * as cardRepo from "@kan/db/repository/card.repo";
import * as customFieldImportRepo from "@kan/db/repository/custom-field-import.repo";
import * as customFieldRepo from "@kan/db/repository/custom-field.repo";
import {
  boards,
  cardCustomFieldValues,
  cards,
  customFieldMappings,
  customFieldOptionMappings,
  customFieldOptions,
  customFields,
  lists,
} from "@kan/db/schema";

import type { TestDbClient } from "./test-db";
import { createTestDb, seedTestData } from "./test-db";

describe("custom field repository integration tests", () => {
  let db: TestDbClient;
  let actorUserId: string;
  let boardId: number;
  let boardPublicId: string;
  let cardId: number;
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
    boardId = board!.id;
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
    cardId = card!.id;
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

  it("bulk imports definitions, options and typed card values", async () => {
    const selectedDate = new Date("2026-09-05T12:30:00.000Z");
    const result = await customFieldImportRepo.importBoardCustomFields(db, {
      boardId,
      actorUserId,
      definitions: [
        {
          sourceId: "field-text",
          name: "Customer",
          type: "text",
          showOnCard: true,
          options: [],
        },
        {
          sourceId: "field-number",
          name: "Amount",
          type: "number",
          showOnCard: true,
          options: [],
        },
        {
          sourceId: "field-date",
          name: "Due date",
          type: "date",
          showOnCard: false,
          options: [],
        },
        {
          sourceId: "field-checkbox",
          name: "Approved",
          type: "checkbox",
          showOnCard: true,
          options: [],
        },
        {
          sourceId: "field-select",
          name: "Priority",
          type: "select",
          showOnCard: true,
          options: [
            {
              sourceId: "option-low",
              name: "Low",
              colourCode: "#00ff00",
            },
            {
              sourceId: "option-high",
              name: "High",
              colourCode: "#ff0000",
            },
          ],
        },
      ],
      values: [
        {
          cardId,
          fieldSourceId: "field-text",
          value: { type: "text", value: "Acme" },
        },
        {
          cardId,
          fieldSourceId: "field-number",
          value: { type: "number", value: "13.50" },
        },
        {
          cardId,
          fieldSourceId: "field-date",
          value: { type: "date", value: selectedDate },
        },
        {
          cardId,
          fieldSourceId: "field-checkbox",
          value: { type: "checkbox", value: false },
        },
        {
          cardId,
          fieldSourceId: "field-select",
          value: { type: "select", optionSourceId: "option-high" },
        },
      ],
    });

    expect(result).toEqual({
      definitionsCreated: 5,
      optionsCreated: 2,
      valuesCreated: 5,
    });
    expect(
      await customFieldRepo.listDefinitionsByBoardPublicId(db, boardPublicId),
    ).toMatchObject([
      { name: "Customer", type: "text", position: 0 },
      { name: "Amount", type: "number", position: 1 },
      { name: "Due date", type: "date", position: 2, showOnCard: false },
      { name: "Approved", type: "checkbox", position: 3 },
      {
        name: "Priority",
        type: "select",
        position: 4,
        options: [
          { name: "Low", position: 0 },
          { name: "High", position: 1 },
        ],
      },
    ]);
    expect(
      await customFieldRepo.listValuesByCardPublicId(db, cardPublicId),
    ).toMatchObject([
      { fieldType: "text", textValue: "Acme" },
      { fieldType: "number", numberValue: "13.50" },
      { fieldType: "date", dateValue: selectedDate },
      { fieldType: "checkbox", checkboxValue: false },
      { fieldType: "select", optionName: "High" },
    ]);
  });

  it("rolls back a bulk import with a mismatched select option", async () => {
    await expect(
      customFieldImportRepo.importBoardCustomFields(db, {
        boardId,
        actorUserId,
        definitions: [
          {
            sourceId: "field-first",
            name: "First",
            type: "select",
            showOnCard: true,
            options: [
              {
                sourceId: "option-first",
                name: "First",
                colourCode: null,
              },
            ],
          },
          {
            sourceId: "field-second",
            name: "Second",
            type: "select",
            showOnCard: true,
            options: [],
          },
        ],
        values: [
          {
            cardId,
            fieldSourceId: "field-second",
            value: { type: "select", optionSourceId: "option-first" },
          },
        ],
      }),
    ).rejects.toMatchObject({ code: "OPTION_NOT_FOUND" });

    expect(
      await customFieldRepo.listDefinitionsByBoardPublicId(db, boardPublicId),
    ).toEqual([]);
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

    await expect(
      customFieldRepo.reorderOptions(db, {
        fieldPublicId: select.publicId,
        optionPublicIds: [select.options[0]!.publicId],
        actorUserId,
      }),
    ).rejects.toMatchObject({ code: "ORDER_INVALID" });
    expect(
      (
        await customFieldRepo.listDefinitionsByBoardPublicId(db, boardPublicId)
      )[0]!.options.map((option) => option.name),
    ).toEqual(["High", "Low"]);
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

  it("copies active custom field values when duplicating a card", async () => {
    const text = await createField("text", "Customer");
    const select = await createField("select", "Priority");
    await customFieldRepo.setCardValue(db, {
      cardPublicId,
      fieldPublicId: text.publicId,
      value: { type: "text", value: "Acme" },
      actorUserId,
    });
    await customFieldRepo.setCardValue(db, {
      cardPublicId,
      fieldPublicId: select.publicId,
      value: { type: "select", optionPublicId: select.options[1]!.publicId },
      actorUserId,
    });
    await customFieldRepo.archiveDefinition(db, {
      fieldPublicId: text.publicId,
      actorUserId,
    });

    const [sourceCard] = await db
      .select({ listId: cards.listId })
      .from(cards)
      .where(eq(cards.publicId, cardPublicId));
    const [targetCard] = await db
      .insert(cards)
      .values({
        publicId: "card00000009",
        title: "Duplicated card",
        index: 1,
        listId: sourceCard!.listId,
        createdBy: actorUserId,
      })
      .returning({ id: cards.id, publicId: cards.publicId });

    await expect(
      customFieldRepo.copyActiveCardValues(db, {
        sourceCardPublicId: cardPublicId,
        targetCardId: targetCard!.id,
        actorUserId,
      }),
    ).resolves.toEqual({ copied: 1 });
    await expect(
      customFieldRepo.listValuesByCardPublicId(db, targetCard!.publicId),
    ).resolves.toMatchObject([
      {
        fieldPublicId: select.publicId,
        optionPublicId: select.options[1]!.publicId,
      },
    ]);
  });

  it("maps values transactionally when cards move between boards", async () => {
    const text = await createField("text", "Customer");
    const select = await createField("select", "Priority");
    await customFieldRepo.setCardValue(db, {
      cardPublicId,
      fieldPublicId: text.publicId,
      value: { type: "text", value: "Acme" },
      actorUserId,
    });
    await customFieldRepo.setCardValue(db, {
      cardPublicId,
      fieldPublicId: select.publicId,
      value: { type: "select", optionPublicId: select.options[1]!.publicId },
      actorUserId,
    });

    const [sourceBoard] = await db
      .select({ id: boards.id, workspaceId: boards.workspaceId })
      .from(boards)
      .where(eq(boards.publicId, boardPublicId));
    const [sourceList] = await db
      .select({ id: lists.id })
      .from(lists)
      .where(eq(lists.boardId, sourceBoard!.id));
    const [secondCard] = await db
      .insert(cards)
      .values({
        publicId: "card00000008",
        title: "Second source card",
        index: 1,
        listId: sourceList!.id,
        createdBy: actorUserId,
      })
      .returning();
    await customFieldRepo.setCardValue(db, {
      cardPublicId: secondCard!.publicId,
      fieldPublicId: select.publicId,
      value: { type: "select", optionPublicId: select.options[1]!.publicId },
      actorUserId,
    });

    const [targetBoard] = await db
      .insert(boards)
      .values({
        publicId: "board0000008",
        name: "Target board",
        slug: "target-board",
        workspaceId: sourceBoard!.workspaceId,
        createdBy: actorUserId,
      })
      .returning();
    const [targetList] = await db
      .insert(lists)
      .values({
        publicId: "list00000008",
        name: "Target list",
        index: 0,
        boardId: targetBoard!.id,
        createdBy: actorUserId,
      })
      .returning();
    const targetSelect = await customFieldRepo.createDefinition(db, {
      boardPublicId: targetBoard!.publicId,
      name: "Priority",
      type: "select",
      showOnCard: true,
      actorUserId,
      options: [{ name: "High", colourCode: "#0000ff" }],
    });

    const move = (cardId: number) =>
      cardRepo.reorder(
        db,
        {
          cardId,
          newListId: targetList!.id,
          newIndex: undefined,
        },
        {
          beforeReorder: async (transaction) => {
            await customFieldRepo.moveCardValuesToBoard(transaction, {
              cardId,
              targetBoardId: targetBoard!.id,
              actorUserId,
            });
          },
        },
      );

    const [firstCard] = await db
      .select({ id: cards.id })
      .from(cards)
      .where(eq(cards.publicId, cardPublicId));
    await expect(move(firstCard!.id)).resolves.toMatchObject({
      id: firstCard!.id,
    });

    const firstMappings = await db.select().from(customFieldMappings);
    const firstOptionMappings = await db
      .select()
      .from(customFieldOptionMappings);
    expect(firstMappings).toHaveLength(2);
    expect(firstOptionMappings).toHaveLength(1);

    await db
      .update(customFields)
      .set({ name: "Renamed priority" })
      .where(eq(customFields.publicId, targetSelect.publicId));
    await db
      .update(customFieldOptions)
      .set({ name: "Renamed high" })
      .where(
        eq(customFieldOptions.publicId, targetSelect.options[0]!.publicId),
      );

    await expect(move(secondCard!.id)).resolves.toMatchObject({
      id: secondCard!.id,
    });
    expect(
      await db
        .select({ id: customFields.id })
        .from(customFields)
        .where(eq(customFields.boardId, targetBoard!.id)),
    ).toHaveLength(2);

    const movedSelectValues = await db
      .select({
        cardId: cardCustomFieldValues.cardId,
        fieldId: cardCustomFieldValues.customFieldId,
        optionId: cardCustomFieldValues.optionId,
      })
      .from(cardCustomFieldValues)
      .where(eq(cardCustomFieldValues.fieldType, "select"));
    expect(new Set(movedSelectValues.map((value) => value.fieldId)).size).toBe(
      1,
    );
    expect(new Set(movedSelectValues.map((value) => value.optionId)).size).toBe(
      1,
    );
  });

  it("rolls back an ambiguous cross-board field mapping", async () => {
    const field = await createField("text", "Customer");
    await customFieldRepo.setCardValue(db, {
      cardPublicId,
      fieldPublicId: field.publicId,
      value: { type: "text", value: "Acme" },
      actorUserId,
    });
    const [sourceCard] = await db
      .select({ id: cards.id, listId: cards.listId })
      .from(cards)
      .where(eq(cards.publicId, cardPublicId));
    const [sourceBoard] = await db
      .select({ workspaceId: boards.workspaceId })
      .from(boards)
      .where(eq(boards.publicId, boardPublicId));
    const [targetBoard] = await db
      .insert(boards)
      .values({
        publicId: "board0000007",
        name: "Ambiguous target",
        slug: "ambiguous-target",
        workspaceId: sourceBoard!.workspaceId,
        createdBy: actorUserId,
      })
      .returning();
    const [targetList] = await db
      .insert(lists)
      .values({
        publicId: "list00000007",
        name: "Target list",
        index: 0,
        boardId: targetBoard!.id,
        createdBy: actorUserId,
      })
      .returning();
    await customFieldRepo.createDefinition(db, {
      boardPublicId: targetBoard!.publicId,
      name: "Customer",
      type: "text",
      showOnCard: true,
      actorUserId,
    });
    await customFieldRepo.createDefinition(db, {
      boardPublicId: targetBoard!.publicId,
      name: "Customer",
      type: "text",
      showOnCard: true,
      actorUserId,
    });

    await expect(
      cardRepo.reorder(
        db,
        {
          cardId: sourceCard!.id,
          newListId: targetList!.id,
          newIndex: undefined,
        },
        {
          beforeReorder: async (transaction) => {
            await customFieldRepo.moveCardValuesToBoard(transaction, {
              cardId: sourceCard!.id,
              targetBoardId: targetBoard!.id,
              actorUserId,
            });
          },
        },
      ),
    ).rejects.toMatchObject({ code: "FIELD_MAPPING_AMBIGUOUS" });

    const [storedCard] = await db
      .select({ listId: cards.listId })
      .from(cards)
      .where(eq(cards.id, sourceCard!.id));
    expect(storedCard!.listId).toBe(sourceCard!.listId);
    expect(await db.select().from(customFieldMappings)).toEqual([]);
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
      .select({ id: boards.id, workspaceId: boards.workspaceId })
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

    await expect(
      customFieldRepo.clearCardValue(db, {
        cardPublicId,
        fieldPublicId: select.publicId,
      }),
    ).resolves.toEqual({ cleared: true });
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
      .select({ id: boards.id, workspaceId: boards.workspaceId })
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

    const clonedBoard = await boardRepo.createFromSnapshot(db, {
      source: board!,
      workspaceId: boardScope!.workspaceId,
      createdBy: actorUserId,
      slug: "cloned-test-board",
      name: "Cloned test board",
      type: "regular",
      sourceBoardId: boardScope!.id,
    });
    const clonedSnapshot = await boardRepo.getByPublicId(
      db,
      clonedBoard.publicId,
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
    expect(clonedSnapshot!.customFields[0]).toMatchObject({
      name: "Priority",
      type: "select",
      showOnCard: true,
    });
    expect(clonedSnapshot!.customFields[0]!.publicId).not.toBe(select.publicId);
    expect(clonedSnapshot!.customFields[0]!.options[0]).toMatchObject({
      name: "Low",
      isArchived: true,
    });
    expect(
      clonedSnapshot!.lists[0]!.cards[0]!.customFieldValues[0],
    ).toMatchObject({
      fieldType: "select",
      optionName: "Low",
      optionArchivedAt: expect.any(Date),
    });
    expect(await db.select().from(customFieldMappings)).toHaveLength(1);
    expect(await db.select().from(customFieldOptionMappings)).toHaveLength(2);

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
