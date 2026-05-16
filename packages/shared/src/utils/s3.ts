import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "next-runtime-env";

export function createS3Client() {
  const credentials =
    process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.S3_ACCESS_KEY_ID,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
        }
      : undefined;

  // The AWS SDK throws "Region is missing" if region is undefined or
  // empty string at S3Client construction. Default to "us-east-1" so
  // S3-compatible providers (MinIO, Backblaze B2, R2, Spaces, Wasabi)
  // that don't care about region work without forcing operators to
  // set a meaningless value. Real AWS S3 users should still set
  // S3_REGION explicitly to their bucket's actual region.
  return new S3Client({
    region: process.env.S3_REGION ?? "us-east-1",
    endpoint: process.env.S3_ENDPOINT ?? "",
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials,
  });
}

export async function generateUploadUrl(
  bucket: string,
  key: string,
  contentType: string,
  expiresIn = 3600,
) {
  const client = createS3Client();
  return getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      // Don't set ACL for private files
    }),
    { expiresIn },
  );
}

export async function generateDownloadUrl(
  bucket: string,
  key: string,
  expiresIn = 3600,
) {
  const client = createS3Client();
  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
    { expiresIn },
  );
}

export async function deleteObject(bucket: string, key: string) {
  const client = createS3Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
}

/**
 * Generate presigned URL for an avatar image
 * Returns the URL as-is if it's already a full URL (external provider)
 * Returns presigned URL if it's an S3 key
 * Returns null if image key is missing, bucket is not configured, or URL generation fails
 */
export async function generateAvatarUrl(
  imageKey: string | null | undefined,
  expiresIn = 86400, // 24 hours
): Promise<string | null> {
  if (!imageKey) {
    return null;
  }

  if (imageKey.startsWith("http://") || imageKey.startsWith("https://")) {
    return imageKey;
  }

  const bucket = env("NEXT_PUBLIC_AVATAR_BUCKET_NAME");
  if (!bucket) {
    return null;
  }

  try {
    return await generateDownloadUrl(bucket, imageKey, expiresIn);
  } catch {
    // If URL generation fails, return null
    return null;
  }
}

/**
 * Generate presigned URL for an attachment
 * Returns null if attachment key is missing, bucket is not configured, or URL generation fails
 */
export async function generateAttachmentUrl(
  attachmentKey: string | null | undefined,
  expiresIn = 86400, // 24 hours
): Promise<string | null> {
  if (!attachmentKey) {
    return null;
  }

  const bucket = env("NEXT_PUBLIC_ATTACHMENTS_BUCKET_NAME");
  if (!bucket) {
    return null;
  }

  try {
    return await generateDownloadUrl(bucket, attachmentKey, expiresIn);
  } catch {
    // If URL generation fails, return null
    return null;
  }
}

