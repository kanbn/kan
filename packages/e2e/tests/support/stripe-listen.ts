import { spawn } from "node:child_process";
import type { ChildProcessWithoutNullStreams } from "node:child_process";

const READY_TIMEOUT_MS = 45_000;
const READY_RETRIES = 2;
const RETRY_DELAY_MS = 2_000;

export interface StripeListener {
  process: ChildProcessWithoutNullStreams;
  stop: () => void;
}

function attemptStripeListen(
  forwardUrl: string,
  apiKey: string,
): Promise<StripeListener> {
  return new Promise((resolve, reject) => {
    const child = spawn("stripe", [
      "listen",
      "--skip-update",
      "--forward-to",
      forwardUrl,
      "--api-key",
      apiKey,
    ]);

    const timeout = setTimeout(() => {
      child.kill();
      reject(
        new Error(
          `stripe listen did not become ready forwarding to ${forwardUrl}`,
        ),
      );
    }, READY_TIMEOUT_MS);

    const onStderr = (chunk: Buffer) => {
      if (chunk.toString().includes("Ready!")) {
        clearTimeout(timeout);
        child.stderr.off("data", onStderr);
        resolve({ process: child, stop: () => child.kill() });
      }
    };

    child.stderr.on("data", onStderr);
    child.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

export async function startStripeListen(
  forwardUrl: string,
  apiKey: string,
): Promise<StripeListener> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await attemptStripeListen(forwardUrl, apiKey);
    } catch (err) {
      if (attempt >= READY_RETRIES) throw err;
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
}
