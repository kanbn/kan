import type { TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BoardService } from "../../../board/board.service.js";
import { WorkspaceService } from "../../../workspace/workspace.service.js";
import { BoardTools } from "../board.tools.js";
import { WorkspaceTools } from "../workspace.tools.js";

const mockBoardService = { all: vi.fn(), byId: vi.fn(), bySlug: vi.fn() };
const mockWorkspaceService = { all: vi.fn() };
const user = { id: "user_1", email: "henry@kan.bn" };
const acme = { publicId: "ws_acme12345", name: "Acme" };

let boardTools: BoardTools;
let workspaceTools: WorkspaceTools;

beforeEach(async () => {
  vi.clearAllMocks();
  mockWorkspaceService.all.mockResolvedValue([
    { role: "admin", workspace: acme },
    { role: "member", workspace: { publicId: "ws_other1234", name: "Other" } },
  ]);

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      BoardTools,
      WorkspaceTools,
      { provide: BoardService, useValue: mockBoardService },
      { provide: WorkspaceService, useValue: mockWorkspaceService },
    ],
  }).compile();

  boardTools = module.get(BoardTools);
  workspaceTools = module.get(WorkspaceTools);
});

describe("find_workspace_by_name", () => {
  it("matches case-insensitively", async () => {
    await expect(
      workspaceTools.findWorkspaceByName({ name: "ACME" }, undefined, {
        user,
      }),
    ).resolves.toEqual(acme);
  });

  it("lists the available workspaces when there's no match", async () => {
    await expect(
      workspaceTools.findWorkspaceByName({ name: "Nope" }, undefined, {
        user,
      }),
    ).rejects.toThrow(
      new NotFoundException(
        'No workspace named "Nope". Available workspaces: Acme, Other',
      ),
    );
  });
});

describe("find_board_by_name", () => {
  it("resolves the workspace, then the board, by name", async () => {
    const roadmap = { publicId: "board_123456", name: "Roadmap" };
    mockBoardService.all.mockResolvedValue([roadmap]);

    await expect(
      boardTools.findBoardByName(
        { workspaceName: "acme", boardName: "roadmap" },
        undefined,
        { user },
      ),
    ).resolves.toEqual(roadmap);
    expect(mockBoardService.all).toHaveBeenCalledWith({
      workspacePublicId: acme.publicId,
      userId: user.id,
    });
  });

  it("lists the available boards when there's no match", async () => {
    mockBoardService.all.mockResolvedValue([
      { publicId: "board_123456", name: "Roadmap" },
    ]);

    await expect(
      boardTools.findBoardByName(
        { workspaceName: "Acme", boardName: "Bugs" },
        undefined,
        { user },
      ),
    ).rejects.toThrow(
      'No board named "Bugs" in workspace "Acme". Available boards: Roadmap',
    );
  });
});

describe("get_board", () => {
  it("passes the filters through to the board service", async () => {
    await boardTools.getBoard(
      {
        boardPublicId: "board_123456",
        labelPublicIds: ["label_123456"],
        memberPublicIds: ["member_12345"],
        listPublicIds: ["list_1234567"],
        dueDateFilters: ["overdue"],
      },
      undefined,
      { user },
    );

    expect(mockBoardService.byId).toHaveBeenCalledWith({
      boardPublicId: "board_123456",
      labels: ["label_123456"],
      members: ["member_12345"],
      lists: ["list_1234567"],
      dueDateFilters: ["overdue"],
      cardView: "full",
      userId: user.id,
    });
  });
});
