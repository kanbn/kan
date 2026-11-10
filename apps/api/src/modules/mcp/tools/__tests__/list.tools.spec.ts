import type { TestingModule } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ListService } from "../../../list/list.service.js";
import { ListTools } from "../list.tools.js";

const mockListService = { create: vi.fn(), delete: vi.fn(), update: vi.fn() };
const user = { id: "user_1", email: "henry@kan.bn" };

let tools: ListTools;

beforeEach(async () => {
  vi.clearAllMocks();

  const module: TestingModule = await Test.createTestingModule({
    providers: [ListTools, { provide: ListService, useValue: mockListService }],
  }).compile();

  tools = module.get(ListTools);
});

describe("ListTools", () => {
  it("passes the authenticated MCP user's id and the args through to create", async () => {
    mockListService.create.mockResolvedValue({
      publicId: "list_1",
      name: "To do",
    });

    const result = await tools.createList(
      { name: "To do", boardPublicId: "board_12345" },
      undefined,
      { user },
    );

    expect(result).toEqual({ publicId: "list_1", name: "To do" });
    expect(mockListService.create).toHaveBeenCalledWith({
      name: "To do",
      boardPublicId: "board_12345",
      userId: "user_1",
    });
  });

  it("passes the authenticated MCP user's id and the args through to delete", async () => {
    mockListService.delete.mockResolvedValue({ success: true });

    const result = await tools.deleteList(
      { listPublicId: "list_12345" },
      undefined,
      { user },
    );

    expect(result).toEqual({ success: true });
    expect(mockListService.delete).toHaveBeenCalledWith({
      listPublicId: "list_12345",
      userId: "user_1",
    });
  });

  it("passes the authenticated MCP user's id and the args through to update", async () => {
    mockListService.update.mockResolvedValue({
      publicId: "list_12345",
      name: "Doing",
    });

    const result = await tools.updateList(
      { listPublicId: "list_12345", name: "Doing", index: 1 },
      undefined,
      { user },
    );

    expect(result).toEqual({ publicId: "list_12345", name: "Doing" });
    expect(mockListService.update).toHaveBeenCalledWith({
      listPublicId: "list_12345",
      userId: "user_1",
      name: "Doing",
      index: 1,
    });
  });

  it("rejects when the MCP request has no authenticated user", async () => {
    await expect(
      tools.createList(
        { name: "To do", boardPublicId: "board_12345" },
        undefined,
        undefined,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(mockListService.create).not.toHaveBeenCalled();
  });
});
