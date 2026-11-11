import { beforeEach, describe, expect, it, vi } from "vitest";

const logs = vi.hoisted(() => ({
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
  fatal: vi.fn(),
}));
vi.mock("@kan/logger", () => ({ createLogger: () => logs }));

const { NestPinoLogger } = await import("../nest-pino.logger.js");

const logger = new NestPinoLogger();

beforeEach(() => {
  vi.clearAllMocks();
});

describe("NestPinoLogger", () => {
  it("keeps per-module startup lines at debug and other messages at info", () => {
    logger.log("CardModule dependencies initialized", "InstanceLoader");
    logger.log("Nest application successfully started", "NestApplication");

    expect(logs.debug).toHaveBeenCalledWith(
      { context: "InstanceLoader" },
      "CardModule dependencies initialized",
    );
    expect(logs.info).toHaveBeenCalledWith(
      { context: "NestApplication" },
      "Nest application successfully started",
    );
  });

  it("keeps the stack Nest passes for unhandled exceptions", () => {
    logger.error(
      "database exploded",
      "Error: database exploded\n    at x",
      "ExceptionsHandler",
    );

    expect(logs.error).toHaveBeenCalledWith(
      {
        context: "ExceptionsHandler",
        stack: "Error: database exploded\n    at x",
      },
      "database exploded",
    );
  });
});
