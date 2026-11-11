import type { TestingModule } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ChecklistService } from "../../../checklist/checklist.service.js";
import { ChecklistTools } from "../checklist.tools.js";

const mockChecklistService = {
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  createItem: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
};
const user = { id: "user_1", email: "henry@kan.bn" };

let tools: ChecklistTools;

beforeEach(async () => {
  vi.clearAllMocks();

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      ChecklistTools,
      { provide: ChecklistService, useValue: mockChecklistService },
    ],
  }).compile();

  tools = module.get(ChecklistTools);
});

describe("ChecklistTools", () => {
  it("passes the authenticated MCP user's id and the args through to createChecklist", async () => {
    mockChecklistService.create.mockResolvedValue({
      publicId: "checklist_1",
      name: "Steps",
    });

    const result = await tools.createChecklist(
      { cardPublicId: "card_12345", name: "Steps" },
      undefined,
      { user },
    );

    expect(result).toEqual({ publicId: "checklist_1", name: "Steps" });
    expect(mockChecklistService.create).toHaveBeenCalledWith({
      cardPublicId: "card_12345",
      name: "Steps",
      userId: "user_1",
    });
  });

  it("passes the authenticated MCP user's id and the args through to updateChecklist", async () => {
    mockChecklistService.update.mockResolvedValue({
      publicId: "checklist_12345",
      name: "Renamed",
    });

    const result = await tools.updateChecklist(
      { checklistPublicId: "checklist_12345", name: "Renamed" },
      undefined,
      { user },
    );

    expect(result).toEqual({ publicId: "checklist_12345", name: "Renamed" });
    expect(mockChecklistService.update).toHaveBeenCalledWith({
      checklistPublicId: "checklist_12345",
      name: "Renamed",
      userId: "user_1",
    });
  });

  it("passes the authenticated MCP user's id and the args through to deleteChecklist", async () => {
    mockChecklistService.delete.mockResolvedValue({ success: true });

    const result = await tools.deleteChecklist(
      { checklistPublicId: "checklist_12345" },
      undefined,
      { user },
    );

    expect(result).toEqual({ success: true });
    expect(mockChecklistService.delete).toHaveBeenCalledWith({
      checklistPublicId: "checklist_12345",
      userId: "user_1",
    });
  });

  it("passes the authenticated MCP user's id and the args through to createChecklistItem", async () => {
    mockChecklistService.createItem.mockResolvedValue({
      publicId: "item_1",
      title: "Do the thing",
      completed: false,
    });

    const result = await tools.createChecklistItem(
      { checklistPublicId: "checklist_12345", title: "Do the thing" },
      undefined,
      { user },
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

  it("passes the authenticated MCP user's id and the args through to updateChecklistItem", async () => {
    mockChecklistService.updateItem.mockResolvedValue({
      publicId: "item_12345",
      title: "Do the thing",
      completed: true,
    });

    const result = await tools.updateChecklistItem(
      { checklistItemPublicId: "item_12345", completed: true },
      undefined,
      { user },
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

  it("passes the authenticated MCP user's id and the args through to deleteChecklistItem", async () => {
    mockChecklistService.deleteItem.mockResolvedValue({ success: true });

    const result = await tools.deleteChecklistItem(
      { checklistItemPublicId: "item_12345" },
      undefined,
      { user },
    );

    expect(result).toEqual({ success: true });
    expect(mockChecklistService.deleteItem).toHaveBeenCalledWith({
      checklistItemPublicId: "item_12345",
      userId: "user_1",
    });
  });

  it("rejects when the MCP request has no authenticated user", async () => {
    await expect(
      tools.createChecklist(
        { cardPublicId: "card_12345", name: "Steps" },
        undefined,
        undefined,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(mockChecklistService.create).not.toHaveBeenCalled();
  });
});
