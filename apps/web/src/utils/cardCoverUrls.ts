const COVER_URL_BATCH_SIZE = 50;

export interface CardCoverPreviewSource {
  width: 320 | 640 | 1280;
  url: string;
}

export interface CardCoverImageAttributes {
  src: string;
  srcSet: string;
}

export function getNextCardCoverUrlBatch(
  visibleAttachmentPublicIds: Iterable<string>,
  resolvedUrls: Record<string, CardCoverPreviewSource[]>,
) {
  return [...visibleAttachmentPublicIds]
    .filter((publicId) => !(publicId in resolvedUrls))
    .slice(0, COVER_URL_BATCH_SIZE);
}

export function getCardCoverImageAttributes(
  sources: CardCoverPreviewSource[] | undefined,
): CardCoverImageAttributes | null {
  if (!sources?.length) return null;

  const sortedSources = [...sources].sort(
    (left, right) => left.width - right.width,
  );
  const largestSource = sortedSources.at(-1);
  if (!largestSource) return null;

  return {
    src: largestSource.url,
    srcSet: sortedSources
      .map((source) => `${source.url} ${source.width}w`)
      .join(", "),
  };
}
