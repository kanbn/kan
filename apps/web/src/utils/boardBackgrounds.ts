export interface BoardBackgroundPreviewSource {
  width: number;
  url: string;
}

export interface BoardBackgroundImageAttributes {
  src: string;
  srcSet: string;
}

export function getNextBoardBackgroundUrlBatch(
  visibleBoardPublicIds: Iterable<string>,
  resolvedUrls: Record<string, BoardBackgroundPreviewSource[] | null>,
  limit = 40,
) {
  return [...visibleBoardPublicIds]
    .filter((publicId) => !(publicId in resolvedUrls))
    .slice(0, limit);
}

export function getBoardBackgroundImageAttributes(
  sources: BoardBackgroundPreviewSource[] | undefined,
): BoardBackgroundImageAttributes | null {
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
