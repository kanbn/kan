import type { INestApplication } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { ZodSerializerInterceptor } from "nestjs-zod";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import * as cardActivityRepo from "@kan/db/repository/cardActivity.repo";
import * as memberRepo from "@kan/db/repository/member.repo";
import * as userRepo from "@kan/db/repository/user.repo";

import { StatsController } from "../stats.controller.js";

let app: INestApplication;
let url: string;

beforeAll(async () => {
  vi.stubEnv("KAN_ADMIN_API_KEY", "admin-secret");
  const module = await Test.createTestingModule({
    controllers: [StatsController],
    providers: [
      { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
    ],
  }).compile();
  app = module.createNestApplication();
  await app.listen(0);
  url = `${await app.getUrl()}/stats`;
});

afterAll(async () => {
  vi.unstubAllEnvs();
  await app.close();
});

describe("GET /stats", () => {
  it.each([
    ["no key", {}],
    ["a wrong key", { "x-admin-api-key": "nope" }],
  ])("rejects %s with 401", async (_label, headers) => {
    const res = await fetch(url, { headers });
    expect(res.status).toBe(401);
  });

  it("returns each count under its own key for the admin key", async () => {
    vi.spyOn(userRepo, "getCount").mockResolvedValue(3);
    vi.spyOn(memberRepo, "getActiveCount").mockResolvedValue(5);
    vi.spyOn(cardActivityRepo, "getCount").mockResolvedValue(42);

    const res = await fetch(url, {
      headers: { "x-admin-api-key": "admin-secret" },
    });
    const body = (await res.json()) as Record<string, number>;

    expect(res.status).toBe(200);
    expect(body.users).toBe(3);
    expect(body.activeMembers).toBe(5);
    // Was mis-wired to the active member count in the tRPC version.
    expect(body.cardActivityLogs).toBe(42);
    expect(Object.keys(body)).toHaveLength(14);
  });

  it("rejects everything when no admin key is configured", async () => {
    vi.stubEnv("KAN_ADMIN_API_KEY", "");
    const res = await fetch(url, { headers: { "x-admin-api-key": "" } });
    expect(res.status).toBe(401);
    vi.stubEnv("KAN_ADMIN_API_KEY", "admin-secret");
  });
});
