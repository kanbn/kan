import type { NextApiRequest, NextApiResponse } from "next";

import { withApiLogging } from "@kan/api/utils/apiLogging";
import { withRateLimit } from "@kan/api/utils/rateLimit";
import { createDrizzleClient } from "@kan/db/client";
import * as cardAttachmentRepo from "@kan/db/repository/cardAttachment.repo";
import { generateAttachmentUrl } from "@kan/shared/utils";

const db = createDrizzleClient();

export default withRateLimit(
  { points: 200, duration: 60 },
  withApiLogging(async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { attachmentPublicId } = req.query;
    if (
      typeof attachmentPublicId !== "string" ||
      attachmentPublicId.length < 12
    ) {
      return res.status(400).json({ error: "Invalid attachment ID" });
    }

    try {
      const attachment = await cardAttachmentRepo.getByPublicId(
        db,
        attachmentPublicId,
      );

      if (!attachment || attachment.deletedAt) {
        return res.status(404).json({ error: "Attachment not found" });
      }

      const url = await generateAttachmentUrl(attachment.s3Key);
      if (!url) {
        return res
          .status(500)
          .json({ error: "Unable to generate download URL" });
      }

      res.setHeader("Cache-Control", "private, max-age=3600, immutable");
      res.setHeader("Location", url);
      return res.status(302).end();
    } catch {
      return res.status(500).json({ error: "Internal server error" });
    }
  }),
);
