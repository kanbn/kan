import type { NextApiRequest, NextApiResponse } from "next";

import { withApiLogging } from "@kan/api/utils/apiLogging";
import { withRateLimit } from "@kan/api/utils/rateLimit";

import { env } from "~/env";
import {
  getAllowedAttachmentHosts,
  isAttachmentUrlAllowed,
} from "~/utils/attachmentDownload";

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

    const allowedHosts = getAllowedAttachmentHosts(
      env.S3_ENDPOINT,
      env.NEXT_PUBLIC_STORAGE_URL,
    );

    if (allowedHosts === null) {
      return res
        .status(500)
        .json({ message: "Storage endpoint misconfigured" });
    }

    if (!allowedHosts.length) {
      return res.status(403).json({
        message:
          "Attachment downloads require S3_ENDPOINT or NEXT_PUBLIC_STORAGE_URL to be configured",
      });
    }

    if (!isAttachmentUrlAllowed(url, allowedHosts)) {
      return res.status(403).json({ message: "URL not allowed" });
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
