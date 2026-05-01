import { useCallback, useState } from "react";

import type { PresenceEvent } from "@kan/api/events";
import { authClient } from "@kan/auth/client";
import { env as runtimeEnv } from "next-runtime-env";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";

export type Viewer = {
  userId: string;
  userName: string;
  userImage: string | null;
};

export function useBoardPresence(boardPublicId: string | null): Viewer[] {
  const { workspace } = useWorkspace();
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id;
  const [viewers, setViewers] = useState<Map<string, Viewer>>(new Map());

  const handlePresenceEvent = useCallback(
    (event: PresenceEvent) => {
      setViewers((prev) => {
        const next = new Map(prev);
        if (event.type === "presence.state") {
          next.clear();
          for (const v of event.viewers) {
            if (v.userId !== currentUserId) next.set(v.userId, v);
          }
        } else if (event.type === "presence.joined") {
          if (event.userId !== currentUserId) {
            next.set(event.userId, {
              userId: event.userId,
              userName: event.userName,
              userImage: event.userImage,
            });
          }
        } else if (event.type === "presence.left") {
          next.delete(event.userId);
        }
        return next;
      });
    },
    [currentUserId],
  );

  const enabled =
    Boolean(runtimeEnv("NEXT_PUBLIC_WEBSOCKET_URL")) &&
    !!boardPublicId &&
    workspace.publicId.length === 12;

  api.events.presence.useSubscription(
    {
      workspacePublicId: workspace.publicId,
      boardPublicId: boardPublicId ?? "",
    },
    {
      enabled,
      onData: handlePresenceEvent,
    },
  );

  return Array.from(viewers.values());
}
