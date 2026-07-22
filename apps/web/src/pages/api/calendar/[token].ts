import type { NextApiRequest, NextApiResponse } from "next";
import { eq } from "drizzle-orm";
import { env } from "next-runtime-env";

import { withApiLogging } from "@banana/api/utils/apiLogging";
import { withRateLimit } from "@banana/api/utils/rateLimit";
import { createDrizzleClient } from "@banana/db/client";
import { getCalendarCardsForUser } from "@banana/db/repository/calendar.repo";
import { users } from "@banana/db/schema";

import { renderICal } from "~/utils/ical";

const TOKEN_PATTERN = /^[a-f0-9]{48}$/;

export default withRateLimit(
  { points: 30, duration: 60 },
  withApiLogging(async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "GET") {
      return res.status(405).json({ message: "Method not allowed" });
    }

    const token = typeof req.query.token === "string" ? req.query.token : "";
    if (!TOKEN_PATTERN.test(token)) {
      return res.status(404).end();
    }

    const db = createDrizzleClient();
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.calendarToken, token))
      .limit(1);

    if (!user) {
      return res.status(404).end();
    }

    const cards = await getCalendarCardsForUser(db, { userId: user.id });
    const ical = renderICal(cards, env("NEXT_PUBLIC_BASE_URL") ?? "");

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Cache-Control", "private, max-age=300");
    return res.status(200).send(ical);
  }),
);
