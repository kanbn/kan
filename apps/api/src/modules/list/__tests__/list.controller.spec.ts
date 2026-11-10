import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ListController } from "../list.controller.js";
import { ListService } from "../list.service.js";

const mockListService = {
  create: vi.fn(),
  delete: vi.fn(),
  update: vi.fn(),
};
const user = { id: "user_1", email: "henry@kan.bn" };

let controller: ListController;

beforeEach(async () => {
  vi.clearAllMocks();

  const module: TestingModule = await Test.createTestingModule({
    controllers: [ListController],
    providers: [{ provide: ListService, useValue: mockListService }],
  }).compile();

  controller = module.get(ListController);
});

describe("ListController", () => {
  it("passes the current user's id and body through to create", async () => {
    mockListService.create.mockResolvedValue({
      publicId: "list_1",
      name: "To do",
    });

    const result = await controller.create(user as never, {
      name: "To do",
      boardPublicId: "board_12345",
    } as never);

    expect(result).toEqual({ publicId: "list_1", name: "To do" });
    expect(mockListService.create).toHaveBeenCalledWith({
      name: "To do",
      boardPublicId: "board_12345",
      userId: "user_1",
    });
  });

  it("passes the current user's id and path param through to delete", async () => {
    mockListService.delete.mockResolvedValue({ success: true });

    const result = await controller.delete(user as never, "list_12345");

    expect(result).toEqual({ success: true });
    expect(mockListService.delete).toHaveBeenCalledWith({
      listPublicId: "list_12345",
      userId: "user_1",
    });
  });

  it("passes the current user's id, path param and body through to update", async () => {
    mockListService.update.mockResolvedValue({
      publicId: "list_12345",
      name: "Doing",
    });

    const result = await controller.update(user as never, "list_12345", {
      name: "Doing",
      index: 1,
    } as never);

    expect(result).toEqual({ publicId: "list_12345", name: "Doing" });
    expect(mockListService.update).toHaveBeenCalledWith({
      listPublicId: "list_12345",
      userId: "user_1",
      name: "Doing",
      index: 1,
    });
  });
});
