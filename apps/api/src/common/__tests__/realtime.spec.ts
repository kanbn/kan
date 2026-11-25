import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { hasMaxStreams, openBoardStream } from "../realtime.js";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

it("pings every 25 seconds and closes after 15 to 20 minutes", () => {
  const messages: unknown[] = [];
  let closed = false;
  openBoardStream("user_1", 1).subscribe({
    next: (message) => messages.push(message),
    complete: () => (closed = true),
  });

  vi.advanceTimersByTime(0);
  expect(messages).toEqual([{ comment: "ping" }]);
  vi.advanceTimersByTime(50_000);
  expect(messages).toHaveLength(3);

  vi.advanceTimersByTime(14 * 60_000);
  expect(closed).toBe(false);
  vi.advanceTimersByTime(6 * 60_000);
  expect(closed).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
});

it("counts only open streams", () => {
  const streams = Array.from({ length: 20 }, () =>
    openBoardStream("user_2", 1).subscribe(),
  );
  expect(hasMaxStreams("user_2")).toBe(true);
  expect(hasMaxStreams("user_3")).toBe(false);

  streams.forEach((stream) => stream.unsubscribe());
  expect(hasMaxStreams("user_2")).toBe(false);
});
