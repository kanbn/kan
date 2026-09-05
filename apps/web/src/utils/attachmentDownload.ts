/**
 * Attachment URLs are presigned S3 URLs produced by generateAttachmentUrl, so
 * their host is whichever endpoint the S3 client resolved. Virtual-hosted style
 * puts the bucket in a subdomain, so subdomains of an allowed host are accepted.
 *
 * Returns null when a configured value is not a valid URL.
 */
export const getAllowedAttachmentHosts = (
  s3Endpoint: string | undefined,
  storageUrl: string | undefined,
): string[] | null => {
  const hosts: string[] = [];

  for (const candidate of [s3Endpoint, storageUrl]) {
    if (!candidate) continue;
    try {
      hosts.push(new URL(candidate).hostname.toLowerCase());
    } catch {
      return null;
    }
  }

  return hosts;
};

export const isAttachmentUrlAllowed = (
  url: string,
  allowedHosts: string[],
): boolean => {
  if (!allowedHosts.length) return false;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();

  return allowedHosts.some(
    (allowedHost) =>
      hostname === allowedHost || hostname.endsWith(`.${allowedHost}`),
  );
};
