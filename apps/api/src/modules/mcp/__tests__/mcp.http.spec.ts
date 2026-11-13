import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, expect, it, vi } from "vitest";

import { AuthGuard } from "../../../common/guards/auth.guard.js";
import { WorkspaceService } from "../../workspace/workspace.service.js";
import { McpPlanGuard } from "../mcp-plan.guard.js";
import { McpHttpController } from "../mcp.controller.js";
import { mcpStrategy } from "../mcp.strategy.js";
import { WorkspaceTools } from "../tools/workspace.tools.js";

const all = vi.fn();
let app: INestApplication;
let baseUrl: string;

beforeAll(async () => {
  const module = await Test.createTestingModule({
    controllers: [McpHttpController, WorkspaceTools],
    providers: [{ provide: WorkspaceService, useValue: { all } }],
  })
    .overrideGuard(AuthGuard)
    .useValue({
      canActivate: (ctx: {
        switchToHttp: () => { getRequest: () => { user: unknown } };
      }) => {
        ctx.switchToHttp().getRequest().user = { id: "user_1" };
        return true;
      },
    })
    .overrideGuard(McpPlanGuard)
    .useValue({ canActivate: () => true })
    .compile();

  app = module.createNestApplication();
  mcpStrategy.setHttpAdapter(app.getHttpAdapter());
  app.connectMicroservice({ strategy: mcpStrategy });
  await app.startAllMicroservices();
  await app.listen(0);
  baseUrl = await app.getUrl();
});

afterAll(async () => {
  await app.close();
});

interface RpcResponse {
  result: { tools?: { name: string }[]; isError?: boolean; content?: unknown };
}

const rpc = async (method: string, params: object) => {
  const res = await fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  return { status: res.status, body: (await res.json()) as RpcResponse };
};

it("serves the tools over the MCP HTTP route with the authenticated user", async () => {
  all.mockResolvedValue([
    { role: "admin", workspace: { publicId: "ws_acme12345", name: "Acme" } },
  ]);

  const list = await rpc("tools/list", {});
  expect(list.status).toBe(200);
  expect(list.body.result.tools?.map((t) => t.name)).toContain(
    "list_workspaces",
  );

  const call = await rpc("tools/call", {
    name: "list_workspaces",
    arguments: {},
  });
  expect(all).toHaveBeenCalledWith({ userId: "user_1" });
  expect(call.body.result.isError).toBeFalsy();
  expect(JSON.stringify(call.body.result.content)).toContain("ws_acme12345");
});

it("returns a tool's Nest exception message as an error result", async () => {
  all.mockResolvedValue([]);

  const call = await rpc("tools/call", {
    name: "find_workspace_by_name",
    arguments: { name: "Missing" },
  });
  expect(call.body.result.isError).toBe(true);
  expect(JSON.stringify(call.body.result.content)).toMatch(/Missing/);
});
