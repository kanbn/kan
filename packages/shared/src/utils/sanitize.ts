export const stripHtml = (value: string): string =>
  value.replace(/<[^>]*>/g, "").trim();

const EMBED_MARKER_PATTERN =
  /data-youtube|<img|<iframe|<video|<audio|<object|<embed|<svg/i;

export const normalizeDescription = (
  html: string | null | undefined,
): string | null => {
  if (!html) return null;
  if (EMBED_MARKER_PATTERN.test(html)) return html;
  return stripHtml(html).length > 0 ? html : null;
};
