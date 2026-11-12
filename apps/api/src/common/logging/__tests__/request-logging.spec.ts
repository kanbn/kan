import type {
  CanActivate,
  ExecutionContext,
  INestApplication,
  MiddlewareConsumer,
  NestModule,
} from "@nestjs/common";
import {
  Body,
  Controller,
  Get,
  Module,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const logs = vi.hoisted(() => ({
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
  fatal: vi.fn(),
}));
vi.mock("@kan/logger", () => ({ createLogger: () => logs }));

const { ErrorCaptureFilter } = await import("../error-capture.filter.js");
const { RequestLoggingMiddleware } = await import(
  "../request-logging.middleware.js"
);

class FakeAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    context.switchToHttp().getRequest<{ user?: unknown }>().user = {
      id: "user_1",
      email: "henry@kan.bn",
    };
    return true;
  }
}

@Controller()
class ThingsController {
  @Get("health")
  health() {
    return { status: "ok" };
  }

  @UseGuards(FakeAuthGuard)
  @Post("things/:thingId")
  create(@Param("thingId") thingId: string, @Body() body: object) {
    return { thingId, ...body };
  }

  @Get("missing")
  missing() {
    throw new NotFoundException("Thing not found");
  }

  @Get("boom")
  boom() {
    throw new Error("database exploded");
  }
}

@Module({
  controllers: [ThingsController],
  providers: [{ provide: APP_FILTER, useClass: ErrorCaptureFilter }],
})
class TestModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggingMiddleware).forRoutes("*path");
  }
}

let app: INestApplication;
let url: string;

// The log line is written on the response's "finish" event.
const lastLog = async (level: "info" | "warn" | "error") => {
  await vi.waitFor(() => expect(logs[level]).toHaveBeenCalled());
  return logs[level].mock.calls.at(-1) as [Record<string, unknown>, string];
};

beforeAll(async () => {
  const module = await Test.createTestingModule({
    imports: [TestModule],
  }).compile();
  app = module.createNestApplication({ logger: false });
  await app.listen(0);
  url = await app.getUrl();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("request logging", () => {
  it("logs a successful request with the route template, user and redacted input", async () => {
    const res = await fetch(`${url}/things/thing_123?verbose=1`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-request-id": "req-1" },
      body: JSON.stringify({ name: "Widget", password: "hunter2" }),
    });

    expect(res.status).toBe(201);
    expect(res.headers.get("x-request-id")).toBe("req-1");
    const [meta, msg] = await lastLog("info");
    expect(msg).toBe("REST OK");
    expect(meta).toMatchObject({
      requestId: "req-1",
      procedure: "POST /things/:thingId",
      transport: "rest",
      userId: "user_1",
      status: 201,
    });
    expect(JSON.parse(meta.input as string)).toMatchObject({
      query: { verbose: "1" },
      body: { name: "Widget" },
    });
    expect(JSON.stringify(meta)).not.toContain("hunter2");
    expect(typeof meta.duration).toBe("number");
  });

  it("logs a 4xx as a warning with its message, and leaves the response unchanged", async () => {
    const res = await fetch(`${url}/missing`);

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      statusCode: 404,
      message: "Thing not found",
      error: "Not Found",
    });
    const [meta, msg] = await lastLog("warn");
    expect(msg).toBe("REST error");
    expect(meta).toMatchObject({ status: 404, error: "Thing not found" });
    expect(meta).not.toHaveProperty("err");
  });

  it("logs a 5xx with the full error for its stack", async () => {
    const res = await fetch(`${url}/boom`);

    expect(res.status).toBe(500);
    const [meta] = await lastLog("error");
    expect(meta.status).toBe(500);
    expect((meta.err as Error).message).toBe("database exploded");
  });

  it("logs unmatched routes and generates a request id", async () => {
    const res = await fetch(`${url}/nope`);

    expect(res.status).toBe(404);
    expect(res.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
    const [meta] = await lastLog("warn");
    expect(meta).toMatchObject({ procedure: "GET /nope", status: 404 });
  });

  it("skips health checks", async () => {
    await fetch(`${url}/health`);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(logs.info).not.toHaveBeenCalled();
    expect(logs.warn).not.toHaveBeenCalled();
    expect(logs.error).not.toHaveBeenCalled();
  });
});
