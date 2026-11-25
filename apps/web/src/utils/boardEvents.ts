import { tabId } from "@kan/api-client/tab-id";

const MIN_INTERVAL_MS = 2_000;
// Spreads out everyone watching the same board.
const JITTER_MS = 500;
const BUSY_RETRY_MS = 500;
const RETRY_MS = 10_000;
const MAX_RETRY_MS = 5 * 60_000;

export interface BoardChanges {
  cardPublicIds: string[];
  // Something other than a card changed, or changes may have been missed.
  everything: boolean;
}

// Reports changes other tabs make to a board, grouped together, until the
// returned function is called. Waits while `isBusy`.
export function watchBoard(
  url: string,
  {
    onChange,
    isBusy,
  }: { onChange: (changes: BoardChanges) => void; isBusy: () => boolean },
) {
  let source: EventSource | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let flushTimer: ReturnType<typeof setTimeout> | undefined;
  let retryMs = RETRY_MS;
  let missed = false;
  let lastFlush = 0;
  let cards = new Set<string>();
  let everything = false;

  const flush = () => {
    if (isBusy()) {
      flushTimer = setTimeout(flush, BUSY_RETRY_MS);
      return;
    }
    flushTimer = undefined;
    lastFlush = Date.now();
    const changes = { cardPublicIds: [...cards], everything };
    cards = new Set();
    everything = false;
    onChange(changes);
  };

  const schedule = (cardPublicId?: string) => {
    if (cardPublicId) cards.add(cardPublicId);
    else everything = true;
    flushTimer ??= setTimeout(
      flush,
      Math.max(0, lastFlush + MIN_INTERVAL_MS - Date.now()) +
        Math.random() * JITTER_MS,
    );
  };

  const connect = () => {
    source = new EventSource(url, { withCredentials: true });
    source.onopen = () => {
      retryMs = RETRY_MS;
      if (missed) schedule();
      missed = false;
    };
    source.onmessage = (event: MessageEvent<string>) => {
      const change = JSON.parse(event.data) as {
        cardPublicId?: string;
        tabId?: string;
      };
      if (change.tabId !== tabId) schedule(change.cardPublicId);
    };
    source.onerror = () => {
      missed = true;
      // It reconnects by itself unless the server refused, as it does while
      // restarting.
      if (source?.readyState !== EventSource.CLOSED) return;
      retryTimer = setTimeout(connect, retryMs);
      retryMs = Math.min(retryMs * 2, MAX_RETRY_MS);
    };
  };

  connect();

  return () => {
    source?.close();
    clearTimeout(retryTimer);
    clearTimeout(flushTimer);
  };
}
