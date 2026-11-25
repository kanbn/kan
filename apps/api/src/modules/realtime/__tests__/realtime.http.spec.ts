import type {
  ExecutionContext,
  INestApplication,
  MiddlewareConsumer,
} from "@nestjs/common";
import {
  Controller,
  ForbiddenException,
  Module,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { ZodSerializerInterceptor } from "nestjs-zod";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as boardRepo from "@kan/db/repository/board.repo";
import * as permissions from "@kan/server/utils/permissions";

import { AuthGuard } from "../../../common/guards/auth.guard.js";
import {
  closeBoardStreams,
  MAX_STREAMS_PER_USER,
  publishBoardChange,
  TabIdMiddleware,
} from "../../../common/realtime.js";
import { RealtimeModule } from "../realtime.module.js";

const BOARD_ID = 41;
const OTHER_BOARD_ID = 42;

@Controller()
class ChangeController {
  @Post("change")
  change() {
    publishBoardChange(BOARD_ID, "card_1234567");
    return {};
  }
}

@Module({
  imports: [RealtimeModule],
  controllers: [ChangeController],
  providers: [{ provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor }],
})
class TestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TabIdMiddleware).forRoutes("*path");
  }
}

let app: INestApplication;
let baseUrl: string;
let aborts: AbortController[];

beforeEach(async () => {
  aborts = [];
  vi.spyOn(
    boardRepo,
    "getWorkspaceAndBoardIdByBoardPublicId",
  ).mockImplementation(async (_db, publicId) => {
    // As slow as a query: Nest answers 200 to a handler that throws late.
    await new Promise((resolve) => setTimeout(resolve, 50));
    return (
      publicId === "board_123456"
        ? { id: BOARD_ID, workspaceId: 1, type: "regular" }
        : null
    ) as never;
  });
  vi.spyOn(permissions, "assertPermission").mockResolvedValue(undefined);
  vi.spyOn(permissions, "assertBoardAccess").mockResolvedValue(undefined);

  const module = await Test.createTestingModule({ imports: [TestModule] })
    .overrideGuard(AuthGuard)
    .useValue({
      canActivate: (context: ExecutionContext) => {
        const request = context
          .switchToHttp()
          .getRequest<{ headers: Record<string, string>; user: unknown }>();
        const id = request.headers["x-user"];
        if (!id) throw new UnauthorizedException();
        request.user = { id };
        return true;
      },
    })
    .compile();
  app = module.createNestApplication();
  await app.listen(0);
  baseUrl = await app.getUrl();
});

afterEach(async () => {
  aborts.forEach((abort) => abort.abort());
  await app.close();
  vi.restoreAllMocks();
  delete process.env.DISABLE_REALTIME_UPDATES;
});

const connect = async (user?: string, board = "board_123456") => {
  const abort = new AbortController();
  aborts.push(abort);
  const response = await fetch(`${baseUrl}/boards/${board}/events`, {
    headers: user ? { "x-user": user } : {},
    signal: abort.signal,
  });
  let text = "";
  let ended = false;
  if (response.status === 200 && response.body)
    void (async () => {
      const decoder = new TextDecoder();
      try {
        for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>)
          text += decoder.decode(chunk, { stream: true });
      } catch {
        // Aborted.
      }
      ended = true;
    })();
  return {
    response,
    abort,
    ended: () => ended,
    raw: () => text,
    data: () =>
      [...text.matchAll(/^data: (.*)$/gm)].map(
        ([, json]) => JSON.parse(json ?? "") as unknown,
      ),
  };
};

const change = (headers = {}) =>
  fetch(`${baseUrl}/change`, { method: "POST", headers });

describe("board events", () => {
  it("rejects signed out callers, missing boards and people without access", async () => {
    expect((await connect()).response.status).toBe(401);
    expect((await connect("user_1", "board_missing")).response.status).toBe(
      404,
    );

    vi.mocked(permissions.assertBoardAccess).mockRejectedValue(
      new ForbiddenException(),
    );
    expect((await connect("user_1")).response.status).toBe(403);
    expect(permissions.assertPermission).toHaveBeenCalledWith(
      expect.anything(),
      "user_1",
      1,
      "board:view",
    );
  });

  it("streams changes to its board, with only the card and tab IDs", async () => {
    const stream = await connect("user_1");
    expect(stream.response.headers.get("content-type")).toContain(
      "text/event-stream",
    );
    await vi.waitFor(() => expect(stream.raw()).toContain("ping"));

    publishBoardChange(OTHER_BOARD_ID, "card_other00");
    await change({ "x-tab-id": "tab_1" });
    await change();

    await vi.waitFor(() => expect(stream.data()).toHaveLength(2));
    expect(stream.data()).toEqual([
      { cardPublicId: "card_1234567", tabId: "tab_1" },
      { cardPublicId: "card_1234567" },
    ]);
  });

  it("closes only the streams of the person who lost access", async () => {
    const removed = await connect("user_1");
    const kept = await connect("user_2");

    closeBoardStreams({ userId: "user_1", boardId: OTHER_BOARD_ID });
    closeBoardStreams({ userId: "user_1", boardId: BOARD_ID });

    await vi.waitFor(() => expect(removed.ended()).toBe(true));
    await change();
    await vi.waitFor(() => expect(kept.data()).toHaveLength(1));
    expect(kept.ended()).toBe(false);
  });

  it("limits streams per person and frees them when they close", async () => {
    const streams = await Promise.all(
      Array.from({ length: MAX_STREAMS_PER_USER }, () => connect("user_1")),
    );
    expect(streams.every(({ response }) => response.status === 200)).toBe(true);
    expect((await connect("user_1")).response.status).toBe(429);
    expect((await connect("user_2")).response.status).toBe(200);

    streams[0]?.abort.abort();
    await vi.waitFor(async () =>
      expect((await connect("user_1")).response.status).toBe(200),
    );
  });

  it("can be turned off", async () => {
    process.env.DISABLE_REALTIME_UPDATES = "true";

    expect((await connect("user_1")).response.status).toBe(204);
  });

  it("doesn't hold up shutdown", async () => {
    const stream = await connect("user_1");

    await app.close();

    await vi.waitFor(() => expect(stream.ended()).toBe(true));
  });
});
