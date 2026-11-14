import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ImportController,
  ImportSourceController,
} from "../import.controller.js";
import { ImportService } from "../import.service.js";

const mockImportService = {
  getTrelloBoards: vi.fn(),
  getGitHubProjects: vi.fn(),
  importTrelloBoards: vi.fn(),
  importGitHubProjects: vi.fn(),
};
const user = { id: "user_1", email: "henry@kan.bn" };

let sourceController: ImportSourceController;
let importController: ImportController;

beforeEach(async () => {
  vi.clearAllMocks();

  const module: TestingModule = await Test.createTestingModule({
    controllers: [ImportSourceController, ImportController],
    providers: [{ provide: ImportService, useValue: mockImportService }],
  }).compile();

  sourceController = module.get(ImportSourceController);
  importController = module.get(ImportController);
});

describe("Import controllers", () => {
  it("pass the current user's id and body through to the service", async () => {
    await sourceController.getTrelloBoards(user as never);
    await sourceController.getGitHubProjects(user as never);
    await importController.importTrelloBoards(user as never, {
      boardIds: ["tb1"],
      workspacePublicId: "workspace_12345",
    });
    await importController.importGitHubProjects(user as never, {
      projectIds: ["p1"],
      workspacePublicId: "workspace_12345",
    });

    expect(mockImportService.getTrelloBoards).toHaveBeenCalledWith({
      userId: "user_1",
    });
    expect(mockImportService.getGitHubProjects).toHaveBeenCalledWith({
      userId: "user_1",
    });
    expect(mockImportService.importTrelloBoards).toHaveBeenCalledWith({
      boardIds: ["tb1"],
      workspacePublicId: "workspace_12345",
      userId: "user_1",
    });
    expect(mockImportService.importGitHubProjects).toHaveBeenCalledWith({
      projectIds: ["p1"],
      workspacePublicId: "workspace_12345",
      userId: "user_1",
    });
  });
});
