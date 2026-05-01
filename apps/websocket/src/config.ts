const parseNumber = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const DEFAULT_PORT = 3010;
const DEFAULT_PING_MS = 30_000;
const DEFAULT_PONG_TIMEOUT_MS = 5_000;
const DEFAULT_INGEST_PATH = "/internal/events";

export const websocketConfig = {
  port: parseNumber(
    process.env.WEBSOCKET_PORT,
    parseNumber(process.env.PORT, DEFAULT_PORT),
  ),
  host: process.env.WEBSOCKET_HOST ?? "0.0.0.0",
  keepAlive: {
    enabled: true,
    pingMs: parseNumber(process.env.WEBSOCKET_PING_MS, DEFAULT_PING_MS),
    pongWaitMs: parseNumber(
      process.env.WEBSOCKET_PONG_TIMEOUT_MS,
      DEFAULT_PONG_TIMEOUT_MS,
    ),
  },
  ingest: {
    path: process.env.WEBSOCKET_EVENT_PATH ?? DEFAULT_INGEST_PATH,
    secret: process.env.WEBSOCKET_EVENT_SECRET ?? "",
  },
} as const;

if (process.env.NODE_ENV === "production" && !websocketConfig.ingest.secret) {
  throw new Error("WEBSOCKET_EVENT_SECRET must be set in production");
}
