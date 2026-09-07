import { format, isBefore, isSameYear, startOfDay } from "date-fns";
import { HiOutlinePaperClip } from "react-icons/hi";
import {
  HiBars3BottomLeft,
  HiChatBubbleLeft,
  HiOutlineClock,
} from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import Avatar from "~/components/Avatar";
import Badge from "~/components/Badge";
import CircularProgress from "~/components/CircularProgress";
import LabelIcon from "~/components/LabelIcon";
import { useLocalisation } from "~/hooks/useLocalisation";
import { useCardCoverDisplay } from "~/providers/card-cover-display";
import { getContrastingTextColour } from "~/utils/cardCovers";
import { getAvatarUrl } from "~/utils/helpers";
import { useCardCoverImage } from "./CardCoverImages";

const Card = ({
  title,
  ticketNumber,
  labels,
  members,
  checklists,
  description,
  comments,
  attachments,
  dueDate,
  cover,
}: {
  title: string;
  ticketNumber?: string | null;
  labels: { name: string; colourCode: string | null }[];
  members: {
    publicId: string;
    email: string;
    user: { name: string | null; email: string; image: string | null } | null;
  }[];
  checklists: {
    publicId: string;
    name: string;
    items: {
      publicId: string;
      title: string;
      completed: boolean;
      index: number;
    }[];
  }[];
  description: string | null;
  comments: { publicId: string }[];
  attachments?: { publicId: string }[];
  dueDate?: Date | null;
  cover?:
    | ({
        size: "normal" | "full";
      } & (
        | { kind: "colour"; colourCode: string }
        | { kind: "attachment"; attachmentPublicId: string }
      ))
    | null;
}) => {
  const { dateLocale } = useLocalisation();
  const { display: coverDisplay, isReady: isCoverDisplayReady } =
    useCardCoverDisplay();
  const showCover = isCoverDisplayReady && coverDisplay !== "hidden";
  const attachmentPublicId =
    showCover && cover?.kind === "attachment"
      ? cover.attachmentPublicId
      : undefined;
  const {
    ref: coverRef,
    isResolved: isCoverResolved,
    url: coverUrl,
  } = useCardCoverImage(attachmentPublicId);
  const showYear = dueDate ? !isSameYear(dueDate, new Date()) : false;
  const isOverdue = dueDate ? isBefore(dueDate, startOfDay(new Date())) : false;
  const completedItems = checklists.reduce((acc, checklist) => {
    return acc + checklist.items.filter((item) => item.completed).length;
  }, 0);

  const totalItems = checklists.reduce((acc, checklist) => {
    return acc + checklist.items.length;
  }, 0);

  const progress =
    totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const hasDescription =
    description && description.replace(/<[^>]*>/g, "").trim().length > 0;
  const hasAttachments = attachments && attachments.length > 0;
  const hasDueDate = !!dueDate;
  const isFullColourCover =
    showCover && cover?.kind === "colour" && cover.size === "full";
  const isFullImageCover =
    showCover &&
    cover?.kind === "attachment" &&
    cover.size === "full" &&
    (!isCoverResolved || !!coverUrl);
  const showNormalImageCover =
    showCover &&
    cover?.kind === "attachment" &&
    cover.size === "normal" &&
    (!isCoverResolved || !!coverUrl);
  const isFullCover = isFullColourCover || isFullImageCover;

  return (
    <div
      ref={coverRef}
      className={twMerge(
        "relative flex flex-col overflow-hidden rounded-md border border-light-200 bg-light-50 px-3 py-2 text-sm text-neutral-900 dark:border-dark-200 dark:bg-dark-200 dark:text-dark-1000 dark:hover:bg-dark-300",
        isFullColourCover && "min-h-28 justify-end py-3",
        isFullImageCover && "min-h-40 justify-end py-3",
      )}
      style={
        isFullColourCover ? { backgroundColor: cover.colourCode } : undefined
      }
    >
      {isFullColourCover && coverDisplay === "subdued" && (
        <div
          className="pointer-events-none absolute inset-0 bg-white/60 dark:bg-black/55"
          aria-hidden="true"
        />
      )}
      {showCover && cover?.kind === "colour" && !isFullColourCover && (
        <div
          className={twMerge(
            "-mx-3 -mt-2 mb-2 h-6",
            coverDisplay === "subdued" &&
              "opacity-50 saturate-50 dark:opacity-40",
          )}
          style={{ backgroundColor: cover.colourCode }}
          aria-hidden="true"
        />
      )}
      {showNormalImageCover && (
        <div className="-mx-3 -mt-2 mb-2 h-32 overflow-hidden bg-light-200 dark:bg-dark-100">
          {coverUrl && (
            // The URL already points to a resized preview; proxying it through
            // Next Image would add a second image pipeline for a signed URL.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className={twMerge(
                "h-full w-full object-cover",
                coverDisplay === "subdued" &&
                  "opacity-60 saturate-50 dark:opacity-50 dark:brightness-75",
              )}
            />
          )}
        </div>
      )}
      {isFullImageCover && (
        <>
          {coverUrl && (
            // The URL already points to a resized preview; proxying it through
            // Next Image would add a second image pipeline for a signed URL.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className={twMerge(
                "pointer-events-none absolute inset-0 h-full w-full object-cover",
                coverDisplay === "subdued" &&
                  "opacity-60 saturate-50 dark:opacity-50 dark:brightness-75",
              )}
            />
          )}
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/5"
            aria-hidden="true"
          />
        </>
      )}
      {ticketNumber && !isFullCover && (
        <span className="relative z-[1] mb-1 text-xs text-light-700 dark:text-dark-800">
          {ticketNumber}
        </span>
      )}
      <span
        className={twMerge(
          "relative z-[1] break-words",
          isFullCover && "text-base font-semibold",
          isFullImageCover && "text-white drop-shadow-sm",
        )}
        style={
          isFullColourCover
            ? coverDisplay === "subdued"
              ? undefined
              : { color: getContrastingTextColour(cover.colourCode) }
            : undefined
        }
      >
        {title}
      </span>
      {!isFullCover &&
      (labels.length ||
        members.length ||
        checklists.length > 0 ||
        hasDescription ||
        comments.length > 0 ||
        hasDueDate ||
        hasAttachments) ? (
        <div className="mt-2 flex flex-col justify-end">
          <div className="space-x-0.5">
            {labels.map((label) => (
              <Badge
                value={label.name}
                iconLeft={<LabelIcon colourCode={label.colourCode} />}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between gap-1">
            <div className="flex items-center gap-2">
              {hasDescription && (
                <div className="flex items-center gap-1 text-light-700 dark:text-dark-800">
                  <HiBars3BottomLeft className="h-4 w-4" />
                </div>
              )}
              {hasDueDate && dueDate && (
                <div
                  className={twMerge(
                    "flex items-center gap-1",
                    isOverdue
                      ? "text-red-600 dark:text-red-400"
                      : "text-light-800 dark:text-dark-800",
                  )}
                >
                  <HiOutlineClock className="h-4 w-4" />
                  <span className="text-[11px]">
                    {format(dueDate, showYear ? "do MMM yyyy" : "do MMM", {
                      locale: dateLocale,
                    })}
                  </span>
                </div>
              )}
              {comments.length > 0 && (
                <div className="flex items-center gap-1 text-light-700 dark:text-dark-800">
                  <HiChatBubbleLeft className="h-4 w-4" />
                </div>
              )}
              {hasAttachments && (
                <div className="flex items-center gap-1 text-light-700 dark:text-dark-800">
                  <HiOutlinePaperClip className="h-4 w-4" />
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-1">
              {checklists.length > 0 && (
                <div className="flex items-center gap-1 rounded-full border-[1px] border-light-300 px-2 py-1 dark:border-dark-600">
                  <CircularProgress
                    progress={progress || 2}
                    size="sm"
                    className="flex-shrink-0"
                  />
                  <span className="text-[10px] text-light-900 dark:text-dark-950">
                    {completedItems}/{totalItems}
                  </span>
                </div>
              )}
              {members.length > 0 && (
                <div className="isolate flex justify-end -space-x-1 overflow-hidden">
                  {members.map(({ user, email }) => {
                    const avatarUrl = user?.image
                      ? getAvatarUrl(user.image)
                      : undefined;

                    return (
                      <Avatar
                        name={user?.name ?? ""}
                        email={user?.email ?? email}
                        imageUrl={avatarUrl}
                        size="sm"
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Card;
