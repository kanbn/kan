import { parseMentionsFromHTML } from "@kan/shared/utils";

export function getNewMentionPublicIds(
  previousHtml: string | null,
  nextHtml: string,
): string[] {
  const previousMentionPublicIds = new Set(
    parseMentionsFromHTML(previousHtml ?? ""),
  );

  return parseMentionsFromHTML(nextHtml).filter(
    (publicId) => !previousMentionPublicIds.has(publicId),
  );
}
