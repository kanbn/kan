import { spawn } from "node:child_process";
import type { ChildProcessWithoutNullStreams } from "node:child_process";

const READY_TIMEOUT_MS = 10_000;
const READY_RETRIES = 2;
const RETRY_DELAY_MS = 1_000;

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
      "--all-snapshot",
      "--forward-to",
      forwardUrl,
      "--api-key",
      apiKey,
    ]);

    let output = "";
    let settled = false;

    const timeout = setTimeout(() => {
      child.kill();
      reject(
        new Error(
          `stripe listen did not become ready forwarding to ${forwardUrl}: ${output.trim() || "(no output)"}`,
        ),
      );
    }, READY_TIMEOUT_MS);

    const onStderr = (chunk: Buffer) => {
      output += chunk.toString();
      if (chunk.toString().includes("Ready!")) {
        settled = true;
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
    child.on("exit", (code) => {
      if (settled) return;
      clearTimeout(timeout);
      reject(
        new Error(
          `stripe listen exited (code ${String(code)}) before becoming ready forwarding to ${forwardUrl}: ${output.trim() || "(no output)"}`,
        ),
      );
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
