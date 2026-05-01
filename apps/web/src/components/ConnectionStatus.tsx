import { useEffect, useRef } from "react";
import { useLingui } from "@lingui/react";
import { msg } from "@lingui/core/macro";

import { useWsConnectionState } from "~/hooks/useWsConnectionState";

export default function ConnectionStatus() {
  const { _ } = useLingui();
  const state = useWsConnectionState();
  const wasConnected = useRef(false);

  useEffect(() => {
    if (state === "pending") {
      wasConnected.current = true;
    }
  }, [state]);

  const isReconnecting = state === "connecting" && wasConnected.current;

  if (!isReconnecting) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 shadow-md dark:border-dark-300 dark:bg-dark-100">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-purple-600" />
        </span>
        <span className="text-xs text-neutral-600 dark:text-dark-800">
          {_(msg`Reconnecting…`)}
        </span>
      </div>
    </div>
  );
}
