import type { NextApiRequest, NextApiResponse } from "next";

import { withApiLogging } from "@kan/server/utils/apiLogging";
import { withRateLimit } from "@kan/server/utils/rateLimit";

export default withRateLimit(
  { keyPrefix: "oss-friends", points: 100, duration: 60 },
  withApiLogging(async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "GET") {
      return res.status(405).json({ message: "Method not allowed" });
    }

    try {
      const response = await fetch("https://formbricks.com/api/oss-friends");
      if (!response.ok) {
        throw new Error("Failed to fetch from Formbricks");
      }
      const data: unknown = await response.json();

      return res.status(200).json(data);
    } catch {
      return res.status(500).json({ message: "Failed to fetch OSS friends" });
    }
  }),
);
