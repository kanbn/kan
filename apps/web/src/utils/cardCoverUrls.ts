const COVER_URL_BATCH_SIZE = 50;

export function getNextCardCoverUrlBatch(
  visibleAttachmentPublicIds: Iterable<string>,
  resolvedUrls: Record<string, string | null>,
) {
  return [...visibleAttachmentPublicIds]
    .filter((publicId) => !(publicId in resolvedUrls))
    .slice(0, COVER_URL_BATCH_SIZE);
}
