import {
  CreateBucketCommand,
  HeadBucketCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const minioPort = process.env.MINIO_PORT ?? "9500";
const bucket =
  process.env.NEXT_PUBLIC_ATTACHMENTS_BUCKET_NAME ?? "e2e-attachments";

export default async function globalSetup() {
  const client = new S3Client({
    region: "us-east-1",
    endpoint: `http://127.0.0.1:${minioPort}`,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.MINIO_ROOT_USER ?? "minioadmin",
      secretAccessKey: process.env.MINIO_ROOT_PASSWORD ?? "minioadmin",
    },
  });

  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
  }
}
