import type { GetCardByIdOutput } from "@kan/api/types";

import { api } from "~/utils/api";

export function CardCoverBanner({
  cover,
  boardPublicId,
}: {
  cover: GetCardByIdOutput["cover"];
  boardPublicId: string;
}) {
  const attachmentPublicId =
    cover?.kind === "attachment" ? cover.attachmentPublicId : null;
  const coverUrls = api.board.coverUrls.useQuery(
    {
      boardPublicId,
      attachmentPublicIds: attachmentPublicId ? [attachmentPublicId] : [],
      width: 1280,
    },
    {
      enabled: boardPublicId.length >= 12 && !!attachmentPublicId,
      retry: 1,
    },
  );

  if (cover?.kind === "attachment") {
    const coverUrl = coverUrls.data?.[cover.attachmentPublicId];

    return (
      <div className="mb-6 h-48 w-full overflow-hidden rounded-md bg-light-200 dark:bg-dark-100">
        {coverUrl && (
          // The URL already points to a resized preview; proxying it through
          // Next Image would add a second image pipeline for a signed URL.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt=""
            decoding="async"
            className="h-full w-full object-cover"
          />
        )}
      </div>
    );
  }

  if (cover?.kind !== "colour") return null;

  return (
    <div
      className="mb-6 h-28 w-full rounded-md"
      style={{ backgroundColor: cover.colourCode }}
      aria-hidden="true"
    />
  );
}
