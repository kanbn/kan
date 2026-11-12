import type { ExecutionContext } from "@nestjs/common";
import { ForbiddenException } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as workspaceRepo from "@kan/db/repository/workspace.repo";

import { McpPlanGuard } from "../mcp-plan.guard.js";

vi.mock("@kan/db/repository/workspace.repo", () => ({
  getAllByUserId: vi.fn(),
}));
vi.mock("../../../common/session.util.js", () => ({ db: {} }));

const run = () =>
  new McpPlanGuard().canActivate({
    switchToHttp: () => ({ getRequest: () => ({ user: { id: "user_1" } }) }),
  } as unknown as ExecutionContext);

const withPlans = (...plans: string[]) =>
  vi
    .mocked(workspaceRepo.getAllByUserId)
    .mockResolvedValue(plans.map((plan) => ({ workspace: { plan } })) as never);

const originalEnv = process.env.NEXT_PUBLIC_KAN_ENV;
beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_KAN_ENV = "cloud";
});
afterEach(() => {
  process.env.NEXT_PUBLIC_KAN_ENV = originalEnv;
});

describe("McpPlanGuard", () => {
  it("allows users with a paid workspace on cloud", async () => {
    withPlans("free", "pro");
    await expect(run()).resolves.toBe(true);
  });

  it("rejects users with only free workspaces on cloud", async () => {
    withPlans("free");
    await expect(run()).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows everyone when self-hosted", async () => {
    delete process.env.NEXT_PUBLIC_KAN_ENV;
    withPlans("free");
    await expect(run()).resolves.toBe(true);
    expect(workspaceRepo.getAllByUserId).not.toHaveBeenCalled();
  });
});
