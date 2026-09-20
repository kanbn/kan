import { afterEach, describe, expect, it } from "vitest";

import { createS3Client } from "./s3";

const originalS3Region = process.env.S3_REGION;

afterEach(() => {
  if (originalS3Region === undefined) {
    delete process.env.S3_REGION;
  } else {
    process.env.S3_REGION = originalS3Region;
  }
});

describe("createS3Client", () => {
  it("defaults to us-east-1 when S3_REGION is unset", async () => {
    delete process.env.S3_REGION;

    const client = createS3Client();

    await expect(client.config.region()).resolves.toBe("us-east-1");
    client.destroy();
  });

  it("defaults to us-east-1 when S3_REGION is empty", async () => {
    process.env.S3_REGION = "";

    const client = createS3Client();

    await expect(client.config.region()).resolves.toBe("us-east-1");
    client.destroy();
  });

  it("uses S3_REGION when it is configured", async () => {
    process.env.S3_REGION = "eu-west-1";

    const client = createS3Client();

    await expect(client.config.region()).resolves.toBe("eu-west-1");
    client.destroy();
  });
});
