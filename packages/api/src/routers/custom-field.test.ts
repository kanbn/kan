import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as CustomFieldRepository from "@kan/db/repository/custom-field.repo";
import * as boardRepo from "@kan/db/repository/board.repo";
import * as cardRepo from "@kan/db/repository/card.repo";
import * as customFieldRepo from "@kan/db/repository/custom-field.repo";

import { assertPermission } from "../utils/permissions";
import { customFieldRouter } from "./custom-field";

vi.mock("@kan/db/repository/board.repo", () => ({
  getWorkspaceAndBoardIdByBoardPublicId: vi.fn(),
}));

vi.mock("@kan/db/repository/card.repo", () => ({
  getWorkspaceAndCardIdByCardPublicId: vi.fn(),
}));

vi.mock("@kan/db/repository/custom-field.repo", async (importOriginal) => {
  const actual = await importOriginal<typeof CustomFieldRepository>();
  return {
    ...actual,
    listDefinitionsByBoardPublicId: vi.fn(),
    getWorkspaceAndDefinitionIdByPublicId: vi.fn(),
    getWorkspaceAndOptionIdByPublicId: vi.fn(),
    createDefinition: vi.fn(),
    updateDefinition: vi.fn(),
    archiveDefinition: vi.fn(),
    reorderDefinitions: vi.fn(),
    createOption: vi.fn(),
    updateOption: vi.fn(),
    archiveOption: vi.fn(),
    reorderOptions: vi.fn(),
    listValuesByCardPublicId: vi.fn(),
    setCardValue: vi.fn(),
    clearCardValue: vi.fn(),
  };
});

vi.mock("../utils/permissions", () => ({
  assertPermission: vi.fn(),
}));

const mockBoardScope = vi.mocked(
  boardRepo.getWorkspaceAndBoardIdByBoardPublicId,
);
const mockCardScope = vi.mocked(cardRepo.getWorkspaceAndCardIdByCardPublicId);
const mockFieldScope = vi.mocked(
  customFieldRepo.getWorkspaceAndDefinitionIdByPublicId,
);
const mockOptionScope = vi.mocked(
  customFieldRepo.getWorkspaceAndOptionIdByPublicId,
);
const mockListDefinitions = vi.mocked(
  customFieldRepo.listDefinitionsByBoardPublicId,
);
const mockCreateDefinition = vi.mocked(customFieldRepo.createDefinition);
const mockUpdateDefinition = vi.mocked(customFieldRepo.updateDefinition);
const mockReorderDefinitions = vi.mocked(customFieldRepo.reorderDefinitions);
const mockCreateOption = vi.mocked(customFieldRepo.createOption);
const mockListValues = vi.mocked(customFieldRepo.listValuesByCardPublicId);
const mockSetCardValue = vi.mocked(customFieldRepo.setCardValue);
const mockAssertPermission = vi.mocked(assertPermission);

describe("custom field router", () => {
  const mockDb = {} as never;
  const mockUser = {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Test User",
    email: "test@example.com",
  };
  const ctx = { user: mockUser, db: mockDb } as never;
  const boardPublicId = "board0000001";
  const cardPublicId = "card00000001";
  const fieldPublicId = "field0000001";
  const optionPublicId = "option000001";
  const boardScope = { id: 10, workspaceId: 20 };
  const cardScope = { id: 30, workspaceId: 20 };
  const fieldScope = { id: 40, workspaceId: 20 };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertPermission.mockResolvedValue(undefined);
  });

  it("requires authentication", async () => {
    await expect(
      customFieldRouter
        .createCaller({ user: null, db: mockDb } as never)
        .definitionsByBoard({ boardPublicId }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("reads definitions with board:view and exposes archived options", async () => {
    mockBoardScope.mockResolvedValue(boardScope as never);
    mockListDefinitions.mockResolvedValue([
      {
        publicId: fieldPublicId,
        name: "Priority",
        type: "select",
        position: 0,
        showOnCard: true,
        options: [
          {
            publicId: optionPublicId,
            name: "Done",
            colourCode: "#00ff00",
            position: 0,
            deletedAt: new Date("2026-09-04T12:00:00Z"),
          },
        ],
      },
    ]);

    const result = await customFieldRouter
      .createCaller(ctx)
      .definitionsByBoard({ boardPublicId });

    expect(mockAssertPermission).toHaveBeenCalledWith(
      mockDb,
      mockUser.id,
      boardScope.workspaceId,
      "board:view",
    );
    const option = result.at(0)?.options.at(0);
    expect(option).toMatchObject({ isArchived: true });
    expect(option).not.toHaveProperty("deletedAt");
  });

  it("creates definitions with board:edit and the authenticated actor", async () => {
    mockBoardScope.mockResolvedValue(boardScope as never);
    mockCreateDefinition.mockResolvedValue({
      publicId: fieldPublicId,
      name: "Priority",
      type: "select",
      position: 0,
      showOnCard: true,
      options: [
        {
          publicId: optionPublicId,
          name: "High",
          colourCode: "#ff0000",
          position: 0,
        },
      ],
    });

    await customFieldRouter.createCaller(ctx).createDefinition({
      boardPublicId,
      name: "Priority",
      type: "select",
      showOnCard: true,
      options: [{ name: "High", colourCode: "#ff0000" }],
    });

    expect(mockAssertPermission).toHaveBeenCalledWith(
      mockDb,
      mockUser.id,
      boardScope.workspaceId,
      "board:edit",
    );
    expect(mockCreateDefinition).toHaveBeenCalledWith(mockDb, {
      boardPublicId,
      name: "Priority",
      type: "select",
      showOnCard: true,
      options: [{ name: "High", colourCode: "#ff0000" }],
      actorUserId: mockUser.id,
    });
  });

  it("resolves definition scope before updates", async () => {
    mockFieldScope.mockResolvedValue(fieldScope);
    mockUpdateDefinition.mockResolvedValue({
      publicId: fieldPublicId,
      name: "Customer",
      type: "text",
      position: 0,
      showOnCard: false,
    });

    await customFieldRouter.createCaller(ctx).updateDefinition({
      fieldPublicId,
      showOnCard: false,
    });

    expect(mockAssertPermission).toHaveBeenCalledWith(
      mockDb,
      mockUser.id,
      fieldScope.workspaceId,
      "board:edit",
    );
  });

  it("reorders definitions with board:edit", async () => {
    mockBoardScope.mockResolvedValue(boardScope as never);
    mockReorderDefinitions.mockResolvedValue({ success: true });

    await customFieldRouter.createCaller(ctx).reorderDefinitions({
      boardPublicId,
      fieldPublicIds: [fieldPublicId],
    });

    expect(mockAssertPermission).toHaveBeenCalledWith(
      mockDb,
      mockUser.id,
      boardScope.workspaceId,
      "board:edit",
    );
    expect(mockReorderDefinitions).toHaveBeenCalledWith(mockDb, {
      boardPublicId,
      fieldPublicIds: [fieldPublicId],
      actorUserId: mockUser.id,
    });
  });

  it("uses board:edit for option management", async () => {
    mockFieldScope.mockResolvedValue(fieldScope);
    mockCreateOption.mockResolvedValue({
      publicId: optionPublicId,
      name: "High",
      colourCode: null,
      position: 0,
    });

    await customFieldRouter.createCaller(ctx).createOption({
      fieldPublicId,
      name: "High",
      colourCode: null,
    });

    expect(mockAssertPermission).toHaveBeenCalledWith(
      mockDb,
      mockUser.id,
      fieldScope.workspaceId,
      "board:edit",
    );
    expect(mockOptionScope).not.toHaveBeenCalled();
  });

  it("reads card values with card:view", async () => {
    mockCardScope.mockResolvedValue(cardScope as never);
    mockListValues.mockResolvedValue([]);

    await customFieldRouter.createCaller(ctx).valuesByCard({ cardPublicId });

    expect(mockAssertPermission).toHaveBeenCalledWith(
      mockDb,
      mockUser.id,
      cardScope.workspaceId,
      "card:view",
    );
  });

  it("sets card values with card:edit and returns the stored value", async () => {
    mockCardScope.mockResolvedValue(cardScope as never);
    const storedValue = {
      publicId: "value0000001",
      fieldPublicId,
      fieldType: "number" as const,
      textValue: null,
      numberValue: "1000",
      dateValue: null,
      checkboxValue: null,
      optionPublicId: null,
      optionName: null,
      optionColourCode: null,
      optionArchivedAt: null,
    };
    mockSetCardValue.mockResolvedValue(storedValue);

    const result = await customFieldRouter.createCaller(ctx).setValue({
      cardPublicId,
      fieldPublicId,
      value: { type: "number", value: "1e3" },
    });

    expect(mockAssertPermission).toHaveBeenCalledWith(
      mockDb,
      mockUser.id,
      cardScope.workspaceId,
      "card:edit",
    );
    expect(mockSetCardValue).toHaveBeenCalledWith(mockDb, {
      cardPublicId,
      fieldPublicId,
      value: { type: "number", value: "1e3" },
      actorUserId: mockUser.id,
    });
    expect(result).toEqual(storedValue);
  });

  it("maps repository validation failures to BAD_REQUEST", async () => {
    mockCardScope.mockResolvedValue(cardScope as never);
    mockSetCardValue.mockRejectedValue(
      new customFieldRepo.CustomFieldRepositoryError("FIELD_TYPE_MISMATCH"),
    );

    await expect(
      customFieldRouter.createCaller(ctx).setValue({
        cardPublicId,
        fieldPublicId,
        value: { type: "text", value: "wrong type" },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("returns NOT_FOUND before permission checks when scope is missing", async () => {
    mockFieldScope.mockResolvedValue(null);

    await expect(
      customFieldRouter.createCaller(ctx).updateDefinition({
        fieldPublicId,
        name: "Missing",
      }),
    ).rejects.toBeInstanceOf(TRPCError);
    expect(mockAssertPermission).not.toHaveBeenCalled();
  });
});
