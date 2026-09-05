import type { NextApiRequest, NextApiResponse } from "next";
import { addYears } from "date-fns";

import { createNextApiContext } from "@kan/api/trpc";
import { withApiLogging } from "@kan/api/utils/apiLogging";
import { withRateLimit } from "@kan/api/utils/rateLimit";
import { encryptTrelloToken } from "@kan/api/utils/trello-token";
import * as integrationsRepo from "@kan/db/repository/integration.repo";

import { env } from "~/env";

export default withRateLimit(
  { points: 100, duration: 60 },
  withApiLogging(async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "POST") {
      return res.status(405).json({ message: "Method not allowed" });
    }

    const { user } = await createNextApiContext(req);

    if (!user)
      return res.status(401).json({ message: "User not authenticated" });

    const apiKey = env.TRELLO_APP_API_KEY;

    if (!apiKey)
      return res
        .status(500)
        .json({ message: "Trello API key not set in Environment Variables" });

    const body: unknown = req.body;
    const token =
      typeof body === "object" && body !== null && "token" in body
        ? body.token
        : null;

    if (typeof token !== "string" || !token)
      return res.status(400).json({ message: "No token found" });

    try {
      const { db } = await createNextApiContext(req);

      await integrationsRepo.createOrUpdateProvider(db, {
        provider: "trello",
        userId: user.id,
        accessToken: encryptTrelloToken(token),
        expiresAt: addYears(new Date(), 1),
      });

      return res
        .status(200)
        .json({ message: "Trello authentication successful" });
    } catch {
      return res.status(400).json({ message: "Trello authentication failed" });
    }
  }),
);
