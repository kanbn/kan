import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  CardChecklistController,
  ChecklistController,
} from "../checklist.controller.js";
import { ChecklistService } from "../checklist.service.js";

const mockChecklistService = {
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  createItem: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
};
const user = { id: "user_1", email: "henry@kan.bn" };

let cardChecklistController: CardChecklistController;
let checklistController: ChecklistController;

beforeEach(async () => {
  vi.clearAllMocks();

  const module: TestingModule = await Test.createTestingModule({
    controllers: [CardChecklistController, ChecklistController],
    providers: [{ provide: ChecklistService, useValue: mockChecklistService }],
  }).compile();

  cardChecklistController = module.get(CardChecklistController);
  checklistController = module.get(ChecklistController);
});

describe("CardChecklistController", () => {
  it("passes the current user's id, path param and body through to create", async () => {
    mockChecklistService.create.mockResolvedValue({
      publicId: "checklist_1",
      name: "Steps",
    });

    const result = await cardChecklistController.create(
      user as never,
      "card_12345",
      { name: "Steps" } as never,
    );

    expect(result).toEqual({ publicId: "checklist_1", name: "Steps" });
    expect(mockChecklistService.create).toHaveBeenCalledWith({
      cardPublicId: "card_12345",
      name: "Steps",
      userId: "user_1",
    });
  });
});

describe("ChecklistController", () => {
  it("passes the current user's id, path param and body through to update", async () => {
    mockChecklistService.update.mockResolvedValue({
      publicId: "checklist_12345",
      name: "Renamed",
    });

    const result = await checklistController.update(
      user as never,
      "checklist_12345",
      { name: "Renamed" } as never,
    );

    expect(result).toEqual({ publicId: "checklist_12345", name: "Renamed" });
    expect(mockChecklistService.update).toHaveBeenCalledWith({
      checklistPublicId: "checklist_12345",
      name: "Renamed",
      userId: "user_1",
    });
  });

  it("passes the current user's id and path param through to delete", async () => {
    mockChecklistService.delete.mockResolvedValue({ success: true });

    const result = await checklistController.delete(
      user as never,
      "checklist_12345",
    );

    expect(result).toEqual({ success: true });
    expect(mockChecklistService.delete).toHaveBeenCalledWith({
      checklistPublicId: "checklist_12345",
      userId: "user_1",
    });
  });

  it("passes the current user's id, path param and body through to createItem", async () => {
    mockChecklistService.createItem.mockResolvedValue({
      publicId: "item_1",
      title: "Do the thing",
      completed: false,
    });

    const result = await checklistController.createItem(
      user as never,
      "checklist_12345",
      { title: "Do the thing" } as never,
    );

    expect(result).toEqual({
      publicId: "item_1",
      title: "Do the thing",
      completed: false,
    });
    expect(mockChecklistService.createItem).toHaveBeenCalledWith({
      checklistPublicId: "checklist_12345",
      title: "Do the thing",
      userId: "user_1",
    });
  });

  it("passes the current user's id, path param and body through to updateItem", async () => {
    mockChecklistService.updateItem.mockResolvedValue({
      publicId: "item_12345",
      title: "Do the thing",
      completed: true,
    });

    const result = await checklistController.updateItem(
      user as never,
      "item_12345",
      { completed: true } as never,
    );

    expect(result).toEqual({
      publicId: "item_12345",
      title: "Do the thing",
      completed: true,
    });
    expect(mockChecklistService.updateItem).toHaveBeenCalledWith({
      checklistItemPublicId: "item_12345",
      userId: "user_1",
      title: undefined,
      completed: true,
      index: undefined,
    });
  });

  it("passes the current user's id and path param through to deleteItem", async () => {
    mockChecklistService.deleteItem.mockResolvedValue({ success: true });

    const result = await checklistController.deleteItem(
      user as never,
      "item_12345",
    );

    expect(result).toEqual({ success: true });
    expect(mockChecklistService.deleteItem).toHaveBeenCalledWith({
      checklistItemPublicId: "item_12345",
      userId: "user_1",
    });
  });
});
