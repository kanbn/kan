/**
 * Smoke test: verifies the WebSocket server is reachable and the /health endpoint responds.
 *
 * Usage: pnpm smoke
 * Requires the server to be running on ws://localhost:3010 (or WS_URL env var).
 */
import http from "node:http";
import { WebSocket } from "ws";

const WS_URL = process.env.WS_URL ?? "ws://localhost:3010";
const HEALTH_URL = WS_URL.replace(/^ws/, "http").replace(/\/$/, "") + "/health";
const TIMEOUT_MS = 5_000;

let exitCode = 0;

const fail = (msg: string) => {
  console.error(`[smoke] FAIL: ${msg}`);
  exitCode = 1;
};

// ── 1. Health endpoint ────────────────────────────────────────────────────────
const healthCheck = (): Promise<void> =>
  new Promise((resolve) => {
    const req = http.get(HEALTH_URL, (res) => {
      if (res.statusCode === 200) {
        console.log(`[smoke] PASS: GET ${HEALTH_URL} → 200`);
      } else {
        fail(`GET ${HEALTH_URL} returned ${res.statusCode}`);
      }
      resolve();
    });
    req.on("error", (err) => {
      fail(`GET ${HEALTH_URL} failed: ${err.message}`);
      resolve();
    });
    req.setTimeout(TIMEOUT_MS, () => {
      fail(`GET ${HEALTH_URL} timed out`);
      req.destroy();
      resolve();
    });
  });

// ── 2. WebSocket handshake ────────────────────────────────────────────────────
const wsCheck = (): Promise<void> =>
  new Promise((resolve) => {
    const timer = setTimeout(() => {
      fail(`WebSocket connection to ${WS_URL} timed out after ${TIMEOUT_MS}ms`);
      ws.terminate();
      resolve();
    }, TIMEOUT_MS);

    const ws = new WebSocket(WS_URL);

    ws.once("open", () => {
      clearTimeout(timer);
      console.log(`[smoke] PASS: WebSocket connected to ${WS_URL}`);
      ws.close();
      resolve();
    });

    ws.once("error", (err) => {
      clearTimeout(timer);
      fail(`WebSocket error: ${err.message}`);
      resolve();
    });
  });

// ── Run ───────────────────────────────────────────────────────────────────────
void (async () => {
  await healthCheck();
  await wsCheck();
  process.exit(exitCode);
})();
