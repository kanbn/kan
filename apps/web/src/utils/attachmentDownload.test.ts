import { describe, expect, it } from "vitest";

import {
  getAllowedAttachmentHosts,
  isAttachmentUrlAllowed,
} from "./attachmentDownload";

const METADATA_URL =
  "http://169.254.169.254/latest/meta-data/iam/security-credentials/";

describe("getAllowedAttachmentHosts", () => {
  it("returns no hosts when neither storage variable is set", () => {
    expect(getAllowedAttachmentHosts(undefined, undefined)).toEqual([]);
  });

  it("uses NEXT_PUBLIC_STORAGE_URL when S3_ENDPOINT is blank (AWS S3 setup)", () => {
    expect(
      getAllowedAttachmentHosts(
        undefined,
        "https://s3.us-east-1.amazonaws.com",
      ),
    ).toEqual(["s3.us-east-1.amazonaws.com"]);
  });

  it("collects both hosts when both are set", () => {
    expect(
      getAllowedAttachmentHosts(
        "http://s3.localtest.me:9000",
        "http://cdn.localtest.me",
      ),
    ).toEqual(["s3.localtest.me", "cdn.localtest.me"]);
  });

  it("returns null when a configured value is not a valid URL", () => {
    expect(getAllowedAttachmentHosts("not-a-url", undefined)).toBeNull();
  });
});

describe("isAttachmentUrlAllowed", () => {
  it("rejects everything when no hosts are configured", () => {
    expect(isAttachmentUrlAllowed(METADATA_URL, [])).toBe(false);
    expect(
      isAttachmentUrlAllowed("https://s3.us-east-1.amazonaws.com/a/b", []),
    ).toBe(false);
  });

  it("rejects the cloud metadata endpoint when storage is configured", () => {
    expect(
      isAttachmentUrlAllowed(METADATA_URL, ["s3.us-east-1.amazonaws.com"]),
    ).toBe(false);
  });

  it("allows an exact host match", () => {
    expect(
      isAttachmentUrlAllowed("https://s3.localtest.me:9000/bucket/key", [
        "s3.localtest.me",
      ]),
    ).toBe(true);
  });

  it("allows virtual-hosted style, where the bucket is a subdomain", () => {
    expect(
      isAttachmentUrlAllowed(
        "https://attachments.s3.us-east-1.amazonaws.com/key?X-Amz-Signature=abc",
        ["s3.us-east-1.amazonaws.com"],
      ),
    ).toBe(true);
  });

  it("rejects a lookalike host that merely ends with the allowed name", () => {
    expect(
      isAttachmentUrlAllowed("https://evils3.localtest.me/x", [
        "s3.localtest.me",
      ]),
    ).toBe(false);
  });

  it("rejects a malformed url", () => {
    expect(isAttachmentUrlAllowed("not-a-url", ["s3.localtest.me"])).toBe(
      false,
    );
  });
});
