/// <reference types="vite/client" />
import type { INestApplication, Type } from "@nestjs/common";
import { GUARDS_METADATA, MODULE_METADATA } from "@nestjs/common/constants.js";
import { Test } from "@nestjs/testing";
import { MCP_TOOL_METADATA_KEY } from "@rekog/mcp-nest";
import { afterAll, beforeAll, expect, it, vi } from "vitest";

import { AuthGuard } from "../../../common/guards/auth.guard.js";
import { WorkspaceService } from "../../workspace/workspace.service.js";
import { McpPlanGuard } from "../mcp-plan.guard.js";
import { McpHttpController } from "../mcp.controller.js";
import { McpModule } from "../mcp.module.js";
import { mcpStrategy } from "../mcp.strategy.js";

const all = vi.fn();
let app: INestApplication;
let baseUrl: string;

beforeAll(async () => {
  const module = await Test.createTestingModule({
    controllers: Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      McpModule,
    ) as Type[],
    providers: [{ provide: WorkspaceService, useValue: { all } }],
  })
    .useMocker(() => ({}))
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

it("registers every @Tool in the tools folder with the MCP module", async () => {
  const toolFiles = import.meta.glob<Record<string, unknown>>(
    "../tools/*.tools.ts",
    { eager: true },
  );
  const declared = Object.values(toolFiles)
    .flatMap((exports) => Object.values(exports))
    .filter((value): value is Type => typeof value === "function")
    .flatMap((cls) =>
      Object.values(Object.getOwnPropertyDescriptors(cls.prototype ?? {})).map(
        ({ value }: { value?: unknown }) =>
          typeof value === "function"
            ? (
                Reflect.getMetadata(MCP_TOOL_METADATA_KEY, value) as
                  { name: string } | undefined
              )?.name
            : undefined,
      ),
    )
    .filter((name): name is string => !!name)
    .sort();

  const list = await rpc("tools/list", {});
  expect(declared).toHaveLength(71);
  expect(list.body.result.tools?.map((t) => t.name).sort()).toEqual(declared);
});

it("guards the MCP route with auth and the paid-plan check", () => {
  expect(Reflect.getMetadata(GUARDS_METADATA, McpHttpController)).toEqual([
    AuthGuard,
    McpPlanGuard,
  ]);
});
