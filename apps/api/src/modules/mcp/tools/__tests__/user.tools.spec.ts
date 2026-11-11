import type { TestingModule } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UserService } from "../../../user/user.service.js";
import { UserTools } from "../user.tools.js";

const mockUserService = { getUser: vi.fn(), update: vi.fn() };
const user = { id: "user_1", email: "henry@kan.bn" };

let tools: UserTools;

beforeEach(async () => {
  vi.clearAllMocks();

  const module: TestingModule = await Test.createTestingModule({
    providers: [UserTools, { provide: UserService, useValue: mockUserService }],
  }).compile();

  tools = module.get(UserTools);
});

describe("UserTools", () => {
  it("passes the authenticated MCP user's id through to getCurrentUser", async () => {
    await tools.getCurrentUser({}, undefined, { user });

    expect(mockUserService.getUser).toHaveBeenCalledWith({ userId: "user_1" });
  });

  it("passes the authenticated MCP user's id and args through to updateCurrentUser", async () => {
    await tools.updateCurrentUser({ name: "New" }, undefined, { user });

    expect(mockUserService.update).toHaveBeenCalledWith({
      userId: "user_1",
      name: "New",
    });
  });

  it("rejects requests without an authenticated MCP user", async () => {
    await expect(
      tools.getCurrentUser({}, undefined, undefined),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
