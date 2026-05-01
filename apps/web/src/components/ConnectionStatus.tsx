import { useEffect, useRef, useState } from "react";
import { useLingui } from "@lingui/react";
import { msg } from "@lingui/core/macro";

import { useWsConnectionState } from "~/hooks/useWsConnectionState";

const MAX_VISIBLE_ATTEMPTS = 5;

export default function ConnectionStatus() {
  const { _ } = useLingui();
  const state = useWsConnectionState();
  const wasConnected = useRef(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const prevState = useRef(state);

  useEffect(() => {
    if (state === "pending") {
      wasConnected.current = true;
      // Reset counter on successful reconnect
      setReconnectAttempts(0);
    }

    // Each time we drop back to "connecting" after being connected = one attempt
    if (
      state === "connecting" &&
      wasConnected.current &&
      prevState.current !== "connecting"
    ) {
      setReconnectAttempts((n) => n + 1);
    }

    prevState.current = state;
  }, [state]);

  const isReconnecting = state === "connecting" && wasConnected.current;

  // After MAX_VISIBLE_ATTEMPTS, hide the banner but keep reconnecting silently
  if (!isReconnecting || reconnectAttempts > MAX_VISIBLE_ATTEMPTS) return null;

  return (
    <div className="pointer-events-none fixed bottom-12 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 shadow-md dark:border-dark-300 dark:bg-dark-100">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-600" />
        </span>
        <span className="text-xs text-neutral-600 dark:text-dark-800">
          {_(msg`Reconnecting…`)}
        </span>
      </div>
    </div>
  );
}
