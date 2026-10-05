import { describe, expect, it } from "vitest";

import {
  getAllowedAttachmentHosts,
  isAttachmentUrlAllowed,
} from "./attachmentDownload";

const BUCKET = "kan-attachments";
const AWS_HOST = "s3.us-east-1.amazonaws.com";
const METADATA_URL =
  "http://169.254.169.254/latest/meta-data/iam/security-credentials/";

describe("getAllowedAttachmentHosts", () => {
  it("returns no hosts when neither storage variable is set", () => {
    expect(
      getAllowedAttachmentHosts({
        s3Endpoint: undefined,
        storageUrl: undefined,
        bucket: BUCKET,
      }),
    ).toEqual([]);
  });

  it("uses NEXT_PUBLIC_STORAGE_URL when S3_ENDPOINT is blank (AWS S3 setup)", () => {
    expect(
      getAllowedAttachmentHosts({
        s3Endpoint: undefined,
        storageUrl: `https://${AWS_HOST}`,
        bucket: BUCKET,
      }),
    ).toEqual([AWS_HOST]);
  });

  it("rejects a schemeless endpoint rather than deriving an empty host", () => {
    // new URL("minio.internal:9000").hostname is "", which would otherwise make
    // the allowlist a single empty string and match any trailing-dot hostname.
    expect(
      getAllowedAttachmentHosts({
        s3Endpoint: "minio.internal:9000",
        storageUrl: undefined,
        bucket: BUCKET,
      }),
    ).toBeNull();
  });

  it("accepts the same endpoint once it carries a scheme", () => {
    expect(
      getAllowedAttachmentHosts({
        s3Endpoint: "http://minio.internal:9000",
        storageUrl: undefined,
        bucket: BUCKET,
      }),
    ).toEqual(["minio.internal"]);
  });

  it("rejects a non-http scheme", () => {
    expect(
      getAllowedAttachmentHosts({
        s3Endpoint: "file:///etc/passwd",
        storageUrl: undefined,
        bucket: BUCKET,
      }),
    ).toBeNull();
  });
});

describe("isAttachmentUrlAllowed", () => {
  it("rejects everything when no hosts are configured", () => {
    expect(isAttachmentUrlAllowed(METADATA_URL, [], BUCKET)).toBe(false);
  });

  it("rejects everything when the bucket is not configured", () => {
    expect(
      isAttachmentUrlAllowed(
        `https://${BUCKET}.${AWS_HOST}/key`,
        [AWS_HOST],
        undefined,
      ),
    ).toBe(false);
  });

  it("rejects the cloud metadata endpoint", () => {
    expect(isAttachmentUrlAllowed(METADATA_URL, [AWS_HOST], BUCKET)).toBe(
      false,
    );
  });

  it("allows virtual-hosted URLs for our own bucket", () => {
    expect(
      isAttachmentUrlAllowed(
        `https://${BUCKET}.${AWS_HOST}/key?X-Amz-Signature=abc`,
        [AWS_HOST],
        BUCKET,
      ),
    ).toBe(true);
  });

  it("rejects another tenant's bucket on the same shared domain", () => {
    expect(
      isAttachmentUrlAllowed(
        `https://someone-elses-bucket.${AWS_HOST}/key`,
        [AWS_HOST],
        BUCKET,
      ),
    ).toBe(false);
  });

  it("rejects a deeper subdomain that ends with our bucket host", () => {
    expect(
      isAttachmentUrlAllowed(
        `https://evil.${BUCKET}.${AWS_HOST}/key`,
        [AWS_HOST],
        BUCKET,
      ),
    ).toBe(false);
  });

  it("allows path-style URLs for our own bucket", () => {
    expect(
      isAttachmentUrlAllowed(
        `http://minio.internal:9000/${BUCKET}/key`,
        ["minio.internal"],
        BUCKET,
      ),
    ).toBe(true);
  });

  it("rejects path-style URLs for another bucket on our host", () => {
    expect(
      isAttachmentUrlAllowed(
        "http://minio.internal:9000/other-bucket/key",
        ["minio.internal"],
        BUCKET,
      ),
    ).toBe(false);
  });

  it("rejects a trailing-dot hostname", () => {
    expect(
      isAttachmentUrlAllowed(
        "http://metadata.google.internal./computeMetadata/v1/",
        [AWS_HOST],
        BUCKET,
      ),
    ).toBe(false);
  });

  it("rejects a lookalike host that merely ends with the allowed name", () => {
    expect(
      isAttachmentUrlAllowed(`https://evil${AWS_HOST}/x`, [AWS_HOST], BUCKET),
    ).toBe(false);
  });

  it("rejects non-http schemes", () => {
    expect(
      isAttachmentUrlAllowed("file:///etc/passwd", [AWS_HOST], BUCKET),
    ).toBe(false);
  });

  it("rejects a malformed url", () => {
    expect(isAttachmentUrlAllowed("not-a-url", [AWS_HOST], BUCKET)).toBe(false);
  });
});
