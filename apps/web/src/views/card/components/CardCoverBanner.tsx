import { twMerge } from "tailwind-merge";

import type { GetCardByIdOutput } from "@kan/api/types";

import { useCardCoverDisplay } from "~/providers/card-cover-display";
import { api } from "~/utils/api";
import { getCardCoverImageAttributes } from "~/utils/cardCoverUrls";

export function CardCoverBanner({
  cover,
  boardPublicId,
}: {
  cover: GetCardByIdOutput["cover"];
  boardPublicId: string;
}) {
  const { display, isReady } = useCardCoverDisplay();
  const showCover = isReady && display !== "hidden";
  const attachmentPublicId =
    showCover && cover?.kind === "attachment" ? cover.attachmentPublicId : null;
  const coverUrls = api.board.coverUrls.useQuery(
    {
      boardPublicId,
      attachmentPublicIds: attachmentPublicId ? [attachmentPublicId] : [],
      widths: [640, 1280],
    },
    {
      enabled: boardPublicId.length >= 12 && !!attachmentPublicId,
      retry: 1,
    },
  );

  if (!showCover) return null;

  if (cover?.kind === "attachment") {
    const coverImage = getCardCoverImageAttributes(
      coverUrls.data?.[cover.attachmentPublicId],
    );
    if (!coverImage && (coverUrls.isSuccess || coverUrls.isError)) return null;

    return (
      <div className="mb-6 h-48 w-full overflow-hidden rounded-md bg-light-200 dark:bg-dark-100">
        {coverImage && (
          // The URL already points to a resized preview; proxying it through
          // Next Image would add a second image pipeline for a signed URL.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverImage.src}
            srcSet={coverImage.srcSet}
            sizes="(max-width: 800px) calc(100vw - 3rem), 736px"
            alt=""
            decoding="async"
            className={twMerge(
              "h-full w-full object-cover",
              display === "subdued" &&
                "opacity-60 saturate-50 dark:opacity-50 dark:brightness-75",
            )}
          />
        )}
      </div>
    );
  }

  if (cover?.kind !== "colour") return null;

  return (
    <div
      className={twMerge(
        "mb-6 h-28 w-full rounded-md",
        display === "subdued" && "opacity-50 saturate-50 dark:opacity-40",
      )}
      style={{ backgroundColor: cover.colourCode }}
      aria-hidden="true"
    />
  );
}
