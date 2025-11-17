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

export const websocketConfig = {
  port: parseNumber(
    process.env.WEBSOCKET_PORT,
    parseNumber(process.env.PORT, DEFAULT_PORT),
  ),
  keepAlive: {
    enabled: true,
    pingMs: parseNumber(process.env.WEBSOCKET_PING_MS, DEFAULT_PING_MS),
    pongWaitMs: parseNumber(
      process.env.WEBSOCKET_PONG_TIMEOUT_MS,
      DEFAULT_PONG_TIMEOUT_MS,
    ),
  },
} as const;
