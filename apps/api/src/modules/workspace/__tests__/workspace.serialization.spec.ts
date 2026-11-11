import type { INestApplication } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { ZodSerializerInterceptor } from "nestjs-zod";
import { afterAll, beforeAll, expect, it, vi } from "vitest";

import { AuthGuard } from "../../../common/guards/auth.guard.js";
import { WorkspaceController } from "../workspace.controller.js";
import { WorkspaceService } from "../workspace.service.js";

const byId = vi.fn();
let app: INestApplication;
let baseUrl: string;

beforeAll(async () => {
  const module = await Test.createTestingModule({
    controllers: [WorkspaceController],
    providers: [
      { provide: WorkspaceService, useValue: { byId } },
      { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
    ],
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
    .compile();

  app = module.createNestApplication();
  await app.listen(0);
  baseUrl = await app.getUrl();
});

afterAll(async () => {
  await app.close();
});

it("strips internal ids the service returns but the response DTO does not declare", async () => {
  byId.mockResolvedValue({
    id: 42,
    publicId: "workspace_12345",
    name: "Acme",
    slug: "acme",
    showEmailsToMembers: false,
    weekStartDay: 1,
    members: [],
    subscriptions: [
      {
        id: 7,
        plan: "team",
        status: "active",
        seats: 5,
        unlimitedSeats: false,
        partnerTier: null,
        periodStart: null,
        periodEnd: null,
      },
    ],
  });

  const res = await fetch(`${baseUrl}/workspaces/workspace_12345`);
  const body = (await res.json()) as Record<string, unknown> & {
    subscriptions: Record<string, unknown>[];
  };

  expect(res.status).toBe(200);
  expect(body).not.toHaveProperty("id");
  expect(body.subscriptions[0]).not.toHaveProperty("id");
  expect(body.publicId).toBe("workspace_12345");
});
