import type { NextApiRequest, NextApiResponse } from "next";

import { openApiDocument } from "@kan/api/openapi";
import { withRateLimit } from "@kan/api/utils/rateLimit";

export default withRateLimit(
  { points: 100, duration: 60 },
  (req: NextApiRequest, res: NextApiResponse) => {
    res.status(200).send(openApiDocument);
  },
);
