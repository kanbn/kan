import { spawn } from "node:child_process";
import type { ChildProcessWithoutNullStreams } from "node:child_process";

const READY_TIMEOUT_MS = 20_000;

export interface StripeListener {
  process: ChildProcessWithoutNullStreams;
  stop: () => void;
}

export function startStripeListen(
  forwardUrl: string,
  apiKey: string,
): Promise<StripeListener> {
  return new Promise((resolve, reject) => {
    const child = spawn("stripe", [
      "listen",
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
