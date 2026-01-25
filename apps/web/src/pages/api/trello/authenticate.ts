import type { NextApiRequest, NextApiResponse } from "next";

import { createNextApiContext } from "@kan/api/trpc";
import { integrations } from "@kan/db/schema";
import { addYears } from "date-fns";
import { withRateLimit } from "~/utils/rateLimit";

export default withRateLimit(
  { points: 100, duration: 60 },
  async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { user } = await createNextApiContext(req);

  if (!user)
    return res.status(401).json({ message: "User not authenticated" });

  const apiKey = process.env.TRELLO_APP_API_KEY;

  if (!apiKey)
    return res.status(500).json({ message: "Trello API key not set in Environment Variables" });

  const token = req.body.token;

  if (!token)
    return res.status(400).json({ message: "No token found" });

  try {
    const { db } = await createNextApiContext(req);

    await db.insert(integrations).values({
      provider: "trello",
      userId: user.id,
      accessToken: token,
      expiresAt: addYears(new Date(), 1),
    }).onConflictDoUpdate({
      set: {
        accessToken: token,
        expiresAt: addYears(new Date(), 1),
      },
      target: [integrations.userId, integrations.provider],
    });

    return res.status(200).json({ message: "Trello authentication successful" });
  } catch (err) {
    console.error("Trello authentication error:", err);
    return res.status(400).json({ message: "Trello authentication failed" });
  }
  },
);