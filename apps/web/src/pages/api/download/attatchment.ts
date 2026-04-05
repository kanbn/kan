import type { NextApiRequest, NextApiResponse } from "next";

import { withApiLogging } from "@kan/api/utils/apiLogging";
import { withRateLimit } from "@kan/api/utils/rateLimit";

import { env } from "~/env";

export default withRateLimit(
  { points: 100, duration: 60 },
  withApiLogging(async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "GET") {
      return res.status(405).json({ message: "Method not allowed" });
    }

    const { url, filename } = req.query;

    if (!url || typeof url !== "string") {
      return res.status(400).json({ message: "url parameter is required" });
    }

    const s3Endpoint = env.S3_ENDPOINT;

    if (s3Endpoint) {
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        return res.status(400).json({ message: "Invalid URL" });
      }

      const hostname = parsed.hostname.toLowerCase();
      let allowedHost: string;
      try {
        allowedHost = new URL(s3Endpoint).hostname.toLowerCase();
      } catch {
        return res
          .status(500)
          .json({ message: "Storage endpoint misconfigured" });
      }

      if (hostname !== allowedHost && !hostname.endsWith(`.${allowedHost}`)) {
        return res.status(403).json({ message: "URL not allowed" });
      }
    }

    try {
      const downloadFilename =
        typeof filename === "string"
          ? encodeURIComponent(filename)
          : "attachment";

      const upstream = await fetch(url);

      if (!upstream.ok) {
        return res
          .status(upstream.status)
          .json({ message: "Failed to fetch attachment" });
      }

      const contentType =
        upstream.headers.get("Content-Type") ?? "application/octet-stream";

      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${downloadFilename}"; filename*=UTF-8''${downloadFilename}`,
      );

      const buffer = await upstream.arrayBuffer();
      return res.send(Buffer.from(buffer));
    } catch (error) {
      return res.status(500).json({ message: "Failed to download attachment" });
    }
  }),
);
