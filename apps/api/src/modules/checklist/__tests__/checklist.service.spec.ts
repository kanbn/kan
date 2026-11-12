import { beforeEach, describe, expect, it, vi } from "vitest";

import * as cardRepo from "@kan/db/repository/card.repo";
import * as activityRepo from "@kan/db/repository/cardActivity.repo";
import * as checklistRepo from "@kan/db/repository/checklist.repo";
import * as permissions from "@kan/server/utils/permissions";

import { ChecklistService } from "../checklist.service.js";

const card = {
  id: 1,
  workspaceId: 1,
  boardId: 1,
  boardType: "public" as const,
};

const checklist = {
  id: 1,
  publicId: "checklist_12345",
  name: "Steps",
  cardId: 1,
  card: {
    list: {
      board: { id: 1, type: "public" as const, workspace: { id: 1 } },
    },
  },
};

const item = {
  id: 1,
  publicId: "item_12345",
  title: "Do the thing",
  checklist: {
    cardId: 1,
    card: {
      list: {
        board: { id: 1, type: "public" as const, workspace: { id: 1 } },
      },
    },
  },
};

let service: ChecklistService;

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(permissions, "assertPermission").mockResolvedValue(undefined);
  vi.spyOn(permissions, "assertBoardAccess").mockResolvedValue(undefined);
  vi.spyOn(activityRepo, "create").mockResolvedValue(undefined as never);
  service = new ChecklistService();
});

describe("ChecklistService.create", () => {
  it("creates a checklist on the resolved card", async () => {
    vi.spyOn(cardRepo, "getWorkspaceAndCardIdByCardPublicId").mockResolvedValue(
      card as never,
    );
    vi.spyOn(checklistRepo, "create").mockResolvedValue({
      id: 1,
      publicId: "checklist_12345",
      name: "Steps",
    } as never);

    const result = await service.create({
      cardPublicId: "card_12345",
      name: "Steps",
      userId: "user_1",
    });

    expect(result).toEqual({
      id: 1,
      publicId: "checklist_12345",
      name: "Steps",
    });
  });

  it("throws NOT_FOUND when the card doesn't exist", async () => {
    vi.spyOn(cardRepo, "getWorkspaceAndCardIdByCardPublicId").mockResolvedValue(
      null as never,
    );

    await expect(
      service.create({
        cardPublicId: "card_missing",
        name: "Steps",
        userId: "user_1",
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("ChecklistService.update", () => {
  it("updates the checklist's name", async () => {
    vi.spyOn(checklistRepo, "getChecklistByPublicId").mockResolvedValue(
      checklist as never,
    );
    vi.spyOn(checklistRepo, "updateChecklistById").mockResolvedValue({
      publicId: "checklist_12345",
      name: "Renamed",
    } as never);

    const result = await service.update({
      checklistPublicId: "checklist_12345",
      name: "Renamed",
      userId: "user_1",
    });

    expect(result).toEqual({ publicId: "checklist_12345", name: "Renamed" });
  });
});

describe("ChecklistService.delete", () => {
  it("soft deletes the checklist and its items", async () => {
    vi.spyOn(checklistRepo, "getChecklistByPublicId").mockResolvedValue(
      checklist as never,
    );
    const softDeleteItems = vi
      .spyOn(checklistRepo, "softDeleteAllItemsByChecklistId")
      .mockResolvedValue([] as never);
    vi.spyOn(checklistRepo, "softDeleteById").mockResolvedValue({
      id: 1,
    } as never);

    const result = await service.delete({
      checklistPublicId: "checklist_12345",
      userId: "user_1",
    });

    expect(result).toEqual({ success: true });
    expect(softDeleteItems).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ checklistId: 1 }),
    );
  });
});

describe("ChecklistService.createItem", () => {
  it("creates an item on the resolved checklist", async () => {
    vi.spyOn(checklistRepo, "getChecklistByPublicId").mockResolvedValue(
      checklist as never,
    );
    vi.spyOn(checklistRepo, "createItem").mockResolvedValue({
      id: 1,
      publicId: "item_12345",
      title: "Do the thing",
      completed: false,
    } as never);

    const result = await service.createItem({
      checklistPublicId: "checklist_12345",
      title: "Do the thing",
      userId: "user_1",
    });

    expect(result).toEqual({
      id: 1,
      publicId: "item_12345",
      title: "Do the thing",
      completed: false,
    });
  });
});

describe("ChecklistService.updateItem", () => {
  it("throws BAD_REQUEST when no field is provided", async () => {
    await expect(
      service.updateItem({
        checklistItemPublicId: "item_12345",
        userId: "user_1",
      }),
    ).rejects.toThrow("At least one of title, completed, or index");
  });

  it("updates the item's completed state and logs it", async () => {
    vi.spyOn(
      checklistRepo,
      "getChecklistItemByPublicIdWithChecklist",
    ).mockResolvedValue(item as never);
    vi.spyOn(checklistRepo, "updateItemById").mockResolvedValue({
      publicId: "item_12345",
      title: "Do the thing",
      completed: true,
    } as never);
    const logActivity = vi.spyOn(activityRepo, "create");

    const result = await service.updateItem({
      checklistItemPublicId: "item_12345",
      userId: "user_1",
      completed: true,
    });

    expect(result).toEqual({
      publicId: "item_12345",
      title: "Do the thing",
      completed: true,
    });
    expect(logActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: "card.updated.checklist.item.completed",
      }),
    );
  });

  it("reorders the item when index is provided", async () => {
    vi.spyOn(
      checklistRepo,
      "getChecklistItemByPublicIdWithChecklist",
    ).mockResolvedValue(item as never);
    const reorder = vi.spyOn(checklistRepo, "reorderItem").mockResolvedValue({
      publicId: "item_12345",
      title: "Do the thing",
      completed: false,
    } as never);

    await service.updateItem({
      checklistItemPublicId: "item_12345",
      userId: "user_1",
      index: 2,
    });

    expect(reorder).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ itemId: 1, newIndex: 2 }),
    );
  });
});

describe("ChecklistService.deleteItem", () => {
  it("soft deletes the item", async () => {
    vi.spyOn(
      checklistRepo,
      "getChecklistItemByPublicIdWithChecklist",
    ).mockResolvedValue(item as never);
    vi.spyOn(checklistRepo, "softDeleteItemById").mockResolvedValue({
      id: 1,
    } as never);

    const result = await service.deleteItem({
      checklistItemPublicId: "item_12345",
      userId: "user_1",
    });

    expect(result).toEqual({ success: true });
  });
});
