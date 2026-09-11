import { S3Client } from "@aws-sdk/client-s3";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createS3Client } from "./s3";

vi.mock("@aws-sdk/client-s3", () => ({
  DeleteObjectCommand: class {},
  GetObjectCommand: class {},
  PutObjectCommand: class {},
  S3Client: vi.fn(),
}));

describe("createS3Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not add optional checksums to presigned browser uploads", () => {
    createS3Client();

    expect(S3Client).toHaveBeenCalledWith(
      expect.objectContaining({
        requestChecksumCalculation: "WHEN_REQUIRED",
      }),
    );
  });
});
