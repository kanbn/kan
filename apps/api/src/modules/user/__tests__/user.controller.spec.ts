import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UserController } from "../user.controller.js";
import { UserService } from "../user.service.js";

const mockUserService = {
  getUser: vi.fn(),
  update: vi.fn(),
  setPassword: vi.fn(),
};
const user = { id: "user_1", email: "henry@kan.bn" };

let controller: UserController;

beforeEach(async () => {
  vi.clearAllMocks();

  const module: TestingModule = await Test.createTestingModule({
    controllers: [UserController],
    providers: [{ provide: UserService, useValue: mockUserService }],
  }).compile();

  controller = module.get(UserController);
});

describe("UserController", () => {
  it("passes the current user's id through to getUser", async () => {
    await controller.getUser(user as never);

    expect(mockUserService.getUser).toHaveBeenCalledWith({ userId: "user_1" });
  });

  it("passes the current user's id and body through to update", async () => {
    await controller.update(user as never, { name: "New" });

    expect(mockUserService.update).toHaveBeenCalledWith({
      userId: "user_1",
      name: "New",
      image: undefined,
    });
  });

  it("passes the current user's id, body and request headers through to setPassword", async () => {
    await controller.setPassword(
      user as never,
      { newPassword: "hunter2hunter2" },
      { headers: { cookie: "session=abc" } } as never,
    );

    const call = mockUserService.setPassword.mock.calls[0]?.[0] as {
      headers: Headers;
    };
    expect(call).toMatchObject({
      userId: "user_1",
      newPassword: "hunter2hunter2",
    });
    expect(call.headers.get("cookie")).toBe("session=abc");
  });
});
