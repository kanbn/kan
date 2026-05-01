import { useEffect, useState } from "react";

import { getWsClient } from "~/utils/api";

export type WsState = "idle" | "connecting" | "pending";

export function useWsConnectionState(): WsState {
  const [state, setState] = useState<WsState>(() => {
    if (typeof window === "undefined") return "idle";
    const client = getWsClient();
    if (!client) return "idle";
    return client.connectionState.get().state as WsState;
  });

  useEffect(() => {
    const client = getWsClient();
    if (!client) return;

    const sub = client.connectionState.subscribe({
      next(s) {
        setState(s.state as WsState);
      },
    });

    return () => sub.unsubscribe();
  }, []);

  return state;
}
