import type { NextApiRequest, NextApiResponse } from "next";
import { PutObjectCommand } from "@aws-sdk/client-s3";

import { createNextApiContext } from "@kan/api/trpc";
import * as userRepo from "@kan/db/repository/user.repo";

import { env } from "~/env";
import { withRateLimit } from "@kan/api/utils/rateLimit";
import { createS3Client } from "@kan/shared/utils";

const MAX_SIZE_BYTES = parseInt(process.env.S3_AVATAR_UPLOAD_LIMIT || '2097152', 10); // Default 2MB
const allowedContentTypes = ["image/jpeg", "image/png", "image/webp"];

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

      const bucket = env.NEXT_PUBLIC_AVATAR_BUCKET_NAME;
      if (!bucket) {
        return res.status(500).json({ error: "Avatar bucket not configured" });
      }

      const contentType = req.headers["content-type"];
      const contentLengthHeader = req.headers["content-length"];
      const contentLength = contentLengthHeader
        ? Number.parseInt(contentLengthHeader, 10)
        : NaN;

      if (typeof contentType !== "string") {
        return res.status(400).json({ error: "Missing content type" });
      }

      if (!allowedContentTypes.includes(contentType)) {
        return res.status(400).json({ error: "Invalid content type" });
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

      const s3Key = `${user.id}/${sanitizedFilename}`;

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

      // Update user image in database
      const updatedUser = await userRepo.update(db, user.id, {
        image: s3Key,
      });

      return res.status(200).json({
        key: s3Key,
        filename: sanitizedFilename,
        contentType,
        size: contentLength,
        user: updatedUser,
      });
    } catch (error) {
      console.error("Avatar upload failed", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

