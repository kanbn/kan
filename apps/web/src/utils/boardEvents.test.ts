import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { tabId } from "@kan/api-client/tab-id";

import { watchBoard } from "./boardEvents";

class FakeEventSource {
  static readonly CLOSED = 2;
  static all: FakeEventSource[] = [];
  readyState = 0;
  onopen?: () => void;
  onmessage?: (event: { data: string }) => void;
  onerror?: () => void;

  constructor(readonly url: string) {
    FakeEventSource.all.push(this);
  }

  open() {
    this.readyState = 1;
    this.onopen?.();
  }

  change(change: { cardPublicId?: string; tabId?: string }) {
    this.onmessage?.({ data: JSON.stringify(change) });
  }

  fail(readyState: number) {
    this.readyState = readyState;
    this.onerror?.();
  }

  close() {
    this.readyState = FakeEventSource.CLOSED;
  }
}

const latest = () => {
  const source = FakeEventSource.all.at(-1);
  if (!source) throw new Error("Not connected");
  return source;
};

const onChange = vi.fn();
let busy: boolean;
let stop: () => void;

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(Math, "random").mockReturnValue(0);
  vi.stubGlobal("EventSource", FakeEventSource);
  FakeEventSource.all = [];
  onChange.mockReset();
  busy = false;
  stop = watchBoard("/events", { onChange, isBusy: () => busy });
  latest().open();
});

afterEach(() => {
  stop();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("watchBoard", () => {
  it("doesn't report anything on first connecting", () => {
    vi.advanceTimersByTime(60_000);

    expect(onChange).not.toHaveBeenCalled();
  });

  it("groups changes, at most every two seconds", () => {
    latest().change({ cardPublicId: "a" });
    vi.advanceTimersByTime(0);
    latest().change({ cardPublicId: "b" });
    latest().change({ cardPublicId: "c" });
    latest().change({ cardPublicId: "b" });
    latest().change({});
    vi.advanceTimersByTime(1_999);

    expect(onChange.mock.calls).toEqual([
      [{ cardPublicIds: ["a"], everything: false }],
    ]);
    vi.advanceTimersByTime(1);
    expect(onChange.mock.calls[1]).toEqual([
      { cardPublicIds: ["b", "c"], everything: true },
    ]);
  });

  it("ignores this tab's own changes but not another tab's or an agent's", () => {
    latest().change({ cardPublicId: "a", tabId });
    vi.advanceTimersByTime(5_000);
    expect(onChange).not.toHaveBeenCalled();

    latest().change({ cardPublicId: "b", tabId: "other" });
    latest().change({ cardPublicId: "c" });
    vi.advanceTimersByTime(5_000);
    expect(onChange).toHaveBeenCalledExactlyOnceWith({
      cardPublicIds: ["b", "c"],
      everything: false,
    });
  });

  it("waits until nothing is being dragged or saved", () => {
    busy = true;
    latest().change({ cardPublicId: "a" });
    vi.advanceTimersByTime(10_000);
    expect(onChange).not.toHaveBeenCalled();

    busy = false;
    vi.advanceTimersByTime(500);
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("catches up after the browser reconnects", () => {
    latest().fail(0);
    latest().open();
    vi.advanceTimersByTime(0);

    expect(FakeEventSource.all).toHaveLength(1);
    expect(onChange).toHaveBeenCalledExactlyOnceWith({
      cardPublicIds: [],
      everything: true,
    });
  });

  it("tries again, less and less often, when refused", () => {
    latest().fail(FakeEventSource.CLOSED);
    vi.advanceTimersByTime(10_000);
    expect(FakeEventSource.all).toHaveLength(2);

    latest().fail(FakeEventSource.CLOSED);
    vi.advanceTimersByTime(19_999);
    expect(FakeEventSource.all).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(FakeEventSource.all).toHaveLength(3);

    latest().open();
    vi.advanceTimersByTime(0);
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("stops for good", () => {
    const source = latest();
    source.change({ cardPublicId: "a" });
    source.fail(FakeEventSource.CLOSED);
    stop();
    vi.advanceTimersByTime(60_000);

    expect(source.readyState).toBe(FakeEventSource.CLOSED);
    expect(FakeEventSource.all).toHaveLength(1);
    expect(onChange).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
