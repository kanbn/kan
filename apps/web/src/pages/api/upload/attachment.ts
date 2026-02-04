import type { NextApiRequest, NextApiResponse } from "next";
import { PutObjectCommand } from "@aws-sdk/client-s3";

import { createNextApiContext } from "@kan/api/trpc";
import * as cardRepo from "@kan/db/repository/card.repo";
import * as cardActivityRepo from "@kan/db/repository/cardActivity.repo";
import * as cardAttachmentRepo from "@kan/db/repository/cardAttachment.repo";
import { generateUID } from "@kan/shared/utils";

import { env } from "~/env";
import { withRateLimit } from "@kan/api/utils/rateLimit";
import { createS3Client } from "@kan/shared/utils";
import { assertPermission } from "@kan/api/utils/permissions";

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export const config = {
  api: {
    bodyParser: false,
  },
};

export default withRateLimit(
  { points: 100, duration: 60 },
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    try {
      const { user, db } = await createNextApiContext(req);

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const bucket = env.NEXT_PUBLIC_ATTACHMENTS_BUCKET_NAME;
      if (!bucket) {
        return res.status(500).json({ error: "Attachments bucket not configured" });
      }

      const cardPublicId = req.query.cardPublicId;
      if (typeof cardPublicId !== "string" || cardPublicId.length < 12) {
        return res.status(400).json({ error: "Invalid cardPublicId" });
      }

      const contentType = req.headers["content-type"];
      const contentLengthHeader = req.headers["content-length"];
      const contentLength = contentLengthHeader
        ? Number.parseInt(contentLengthHeader, 10)
        : NaN;

      if (typeof contentType !== "string") {
        return res.status(400).json({ error: "Missing content type" });
      }

      if (!Number.isFinite(contentLength) || contentLength <= 0) {
        return res.status(400).json({ error: "Missing or invalid content length" });
      }

      if (contentLength > MAX_SIZE_BYTES) {
        return res.status(400).json({ error: "File too large" });
      }

      const originalFilenameHeader =
        (req.headers["x-original-filename"] as string | undefined) ?? "file";

      const sanitizedFilename = originalFilenameHeader
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .substring(0, 200);

      // Get card and check permissions
      const card = await cardRepo.getWorkspaceAndCardIdByCardPublicId(
        db,
        cardPublicId,
      );

      if (!card) {
        return res.status(404).json({ error: "Card not found" });
      }

      // Check if user has permission to edit the card
      try {
        await assertPermission(db, user.id, card.workspaceId, "card:edit");
      } catch {
        return res.status(403).json({ error: "Permission denied" });
      }

      const s3Key = `${card.workspaceId}/${cardPublicId}/${generateUID()}-${sanitizedFilename}`;

      const client = createS3Client();

      // Upload the file to S3
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: s3Key,
          Body: req,
          ContentType: contentType,
          ContentLength: contentLength,
        }),
      );

      // Create attachment record and log activity
      const attachment = await cardAttachmentRepo.create(db, {
        cardId: card.id,
        filename: sanitizedFilename,
        originalFilename: originalFilenameHeader,
        contentType,
        size: contentLength,
        s3Key,
        createdBy: user.id,
      });

      await cardActivityRepo.create(db, {
        type: "card.updated.attachment.added",
        cardId: card.id,
        createdBy: user.id,
      });

      return res.status(200).json({ attachment });
    } catch (error) {
      console.error("Attachment upload failed", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

