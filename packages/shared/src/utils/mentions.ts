/**
 * Parses mention data-id attributes from HTML content
 * Mentions are stored as: <span data-type="mention" data-id="..." data-label="...">@label</span>
 * @param htmlContent - The HTML content to parse
 * @returns Array of unique mention public IDs
 */
export function parseMentionsFromHTML(htmlContent: string): string[] {
  if (!htmlContent) return [];

  // Match all mention spans with data-id attributes
  const mentionRegex = /<span[^>]*data-type="mention"[^>]*data-id="([^"]+)"[^>]*>/gi;
  const matches = Array.from(htmlContent.matchAll(mentionRegex));
  
  // Extract unique mention IDs
  const mentionIds = matches
    .map((match) => match[1])
    .filter((id): id is string => !!id && id.length >= 12);

  // Return unique IDs
  return Array.from(new Set(mentionIds));
}

