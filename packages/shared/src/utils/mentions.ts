// Mentions are stored as <span data-type="mention" data-id="..." data-label="...">.
export function parseMentionsFromHTML(htmlContent: string): string[] {
  if (!htmlContent) return [];

  const mentionRegex = /<span[^>]*data-type="mention"[^>]*data-id="([^"]+)"[^>]*>/gi;
  const matches = Array.from(htmlContent.matchAll(mentionRegex));
  
  const mentionIds = matches
    .map((match) => match[1])
    .filter((id): id is string => !!id && id.length >= 12);

  return Array.from(new Set(mentionIds));
}

