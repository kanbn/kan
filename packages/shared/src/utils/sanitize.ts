/**
 * Strips all HTML tags from a string, returning plain text.
 * Use this on any user-supplied text field before storing or displaying.
 */
export const stripHtml = (value: string): string =>
  value.replace(/<[^>]*>/g, "").trim();
