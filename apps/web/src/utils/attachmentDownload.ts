/**
 * Attachment URLs are presigned S3 URLs produced by generateAttachmentUrl, so a
 * legitimate URL always points at our own bucket on our own storage host, in one
 * of two shapes:
 *
 *   virtual-hosted:  https://{bucket}.{host}/{key}
 *   path-style:      https://{host}/{bucket}/{key}
 *
 * Matching the host alone is not enough: on a shared domain such as
 * s3.us-east-1.amazonaws.com every other tenant's bucket is a sibling
 * subdomain, so the bucket has to be part of the check.
 */
export interface AttachmentStorageConfig {
  s3Endpoint: string | undefined;
  storageUrl: string | undefined;
  bucket: string | undefined;
}

const parseHost = (value: string): string | null => {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  // A schemeless value such as "minio.internal:9000" parses with the host as
  // the protocol and an empty hostname, so require an explicit http(s) scheme.
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (!parsed.hostname) return null;

  return parsed.hostname.toLowerCase();
};

/** Returns null when a configured endpoint is present but unusable. */
export const getAllowedAttachmentHosts = (
  config: AttachmentStorageConfig,
): string[] | null => {
  const hosts: string[] = [];

  for (const candidate of [config.s3Endpoint, config.storageUrl]) {
    if (!candidate) continue;
    const host = parseHost(candidate);
    if (host === null) return null;
    hosts.push(host);
  }

  return hosts;
};

export const isAttachmentUrlAllowed = (
  url: string,
  allowedHosts: string[],
  bucket: string | undefined,
): boolean => {
  if (!allowedHosts.length || !bucket) return false;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;

  const hostname = parsed.hostname.toLowerCase();
  const wantedBucket = bucket.toLowerCase();

  return allowedHosts.some((allowedHost) => {
    // path-style: the bucket is the first path segment
    if (hostname === allowedHost) {
      return parsed.pathname.startsWith(`/${wantedBucket}/`);
    }
    // virtual-hosted: the bucket is the only permitted subdomain label
    return hostname === `${wantedBucket}.${allowedHost}`;
  });
};
