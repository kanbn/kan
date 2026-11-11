import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WorkspaceController } from "../workspace.controller.js";
import { WorkspaceService } from "../workspace.service.js";

const mockWorkspaceService = {
  all: vi.fn(),
  checkSlugAvailability: vi.fn(),
  hasAvailablePartnerSlot: vi.fn(),
  bySlug: vi.fn(),
  byId: vi.fn(),
  search: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};
const user = { id: "user_1", email: "henry@kan.bn" };

let controller: WorkspaceController;

beforeEach(async () => {
  vi.clearAllMocks();

  const module: TestingModule = await Test.createTestingModule({
    controllers: [WorkspaceController],
    providers: [{ provide: WorkspaceService, useValue: mockWorkspaceService }],
  }).compile();

  controller = module.get(WorkspaceController);
});

describe("WorkspaceController", () => {
  it("passes the current user's id through to all", async () => {
    mockWorkspaceService.all.mockResolvedValue([]);

    expect(await controller.all(user as never)).toEqual([]);
    expect(mockWorkspaceService.all).toHaveBeenCalledWith({ userId: "user_1" });
  });

  it("passes the current user's id and query through to checkSlugAvailability", async () => {
    mockWorkspaceService.checkSlugAvailability.mockResolvedValue({
      isAvailable: true,
      isReserved: false,
    });

    await controller.checkSlugAvailability(
      user as never,
      {
        workspaceSlug: "acme",
        workspacePublicId: "workspace_12345",
      } as never,
    );

    expect(mockWorkspaceService.checkSlugAvailability).toHaveBeenCalledWith({
      workspaceSlug: "acme",
      workspacePublicId: "workspace_12345",
      userId: "user_1",
    });
  });

  it("passes the current user's id through to hasAvailablePartnerSlot", async () => {
    mockWorkspaceService.hasAvailablePartnerSlot.mockResolvedValue(true);

    expect(await controller.hasAvailablePartnerSlot(user as never)).toBe(true);
    expect(mockWorkspaceService.hasAvailablePartnerSlot).toHaveBeenCalledWith({
      userId: "user_1",
    });
  });

  it("passes the current user's id and path params through to bySlug and byId", async () => {
    await controller.bySlug(user as never, "acme");
    await controller.byId(user as never, "workspace_12345");

    expect(mockWorkspaceService.bySlug).toHaveBeenCalledWith({
      workspaceSlug: "acme",
      userId: "user_1",
    });
    expect(mockWorkspaceService.byId).toHaveBeenCalledWith({
      workspacePublicId: "workspace_12345",
      userId: "user_1",
    });
  });

  it("passes the current user's id, path param and query through to search", async () => {
    await controller.search(user as never, "workspace_12345", {
      query: "foo",
      limit: 10,
    } as never);

    expect(mockWorkspaceService.search).toHaveBeenCalledWith({
      workspacePublicId: "workspace_12345",
      query: "foo",
      limit: 10,
      userId: "user_1",
    });
  });

  it("passes the current user's id and email through to create", async () => {
    await controller.create(
      user as never,
      {
        name: "Acme",
        slug: "acme",
      } as never,
    );

    expect(mockWorkspaceService.create).toHaveBeenCalledWith({
      name: "Acme",
      description: undefined,
      slug: "acme",
      userId: "user_1",
      userEmail: "henry@kan.bn",
    });
  });

  it("passes the current user's id, path param and body through to update", async () => {
    await controller.update(user as never, "workspace_12345", {
      name: "Renamed",
      weekStartDay: 1,
    } as never);

    expect(mockWorkspaceService.update).toHaveBeenCalledWith({
      workspacePublicId: "workspace_12345",
      userId: "user_1",
      name: "Renamed",
      slug: undefined,
      description: undefined,
      showEmailsToMembers: undefined,
      weekStartDay: 1,
    });
  });

  it("passes the current user's id and path param through to delete", async () => {
    mockWorkspaceService.delete.mockResolvedValue({ success: true });

    expect(await controller.delete(user as never, "workspace_12345")).toEqual({
      success: true,
    });
    expect(mockWorkspaceService.delete).toHaveBeenCalledWith({
      workspacePublicId: "workspace_12345",
      userId: "user_1",
    });
  });
});
