import { authClient } from "@banana/auth/client";
import { useEffect, useRef } from "react";

import { api } from "~/utils/api";

/**
 * Persist the browser's IANA timezone (e.g. "America/New_York") onto the user
 * record once per session. Powers the daily overdue nudge, which fires at 9am in
 * each member's own timezone rather than the server's. Silent + renders nothing.
 */
export function TimezoneCapture() {
  const { data: session } = authClient.useSession();
  const setTimezone = api.user.setTimezone.useMutation();
  const captured = useRef<string | null>(null);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) {
      // Reset so a fresh login (or a timezone change) is re-captured.
      captured.current = null;
      return;
    }
    if (captured.current) return;

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!timezone) return;

    captured.current = userId;
    setTimezone.mutate({ timezone });
    // setTimezone identity is unstable; intentionally omitted from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  return null;
}
