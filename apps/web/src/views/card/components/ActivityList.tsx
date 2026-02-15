import type { Locale as DateFnsLocale } from "date-fns";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { format, formatDistanceToNow, isSameYear } from "date-fns";
import { useEffect, useRef, useState } from "react";
import {
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlinePaperClip,
  HiOutlinePencil,
  HiOutlinePlus,
  HiOutlineTag,
  HiOutlineTrash,
  HiOutlineUserMinus,
  HiOutlineUserPlus,
} from "react-icons/hi2";

import type {
  GetCardActivitiesOutput,
  GetCardByIdOutput,
} from "@kan/api/types";
import { authClient } from "@kan/auth/client";

import Avatar from "~/components/Avatar";
import { useLocalisation } from "~/hooks/useLocalisation";
import { api } from "~/utils/api";
import { getAvatarUrl } from "~/utils/helpers";
import Comment from "./Comment";

type ActivityType =
  NonNullable<GetCardByIdOutput>["activities"][number]["type"];

type ActivityWithMergedLabels =
  GetCardActivitiesOutput["activities"][number] & {
    mergedLabels?: string[];
    attachment?: {
      publicId: string;
      filename: string;
      originalFilename: string;
    } | null;
  };

const truncate = (value: string | null, maxLength = 50) => {
  if (!value) return value;
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
};

const getUserDisplayName = (
  user: { name?: string | null; email?: string | null } | null | undefined,
): string => {
  if (user?.name?.trim()) return user.name;
  if (user?.email) return user.email;
  return t`Member`;
};

const getActivityText = ({
  type,
  toTitle,
  fromList,
  toList,
  memberName,
  memberEmail,
  isSelf,
  label,
  fromTitle,
  toDueDate,
  dateLocale,
  mergedLabels,
  attachmentName,
}: {
  type: ActivityType;
  toTitle: string | null;
  fromList: string | null;
  toList: string | null;
  memberName: string | null;
  memberEmail: string | null;
  isSelf: boolean;
  label: string | null;
  fromTitle?: string | null;
  fromDueDate?: Date | null;
  toDueDate?: Date | null;
  dateLocale: DateFnsLocale;
  mergedLabels?: string[];
  attachmentName?: string | null;
}) => {
  const displayName = memberName ?? memberEmail ?? t`Member`;
  const TextHighlight = ({ children }: { children: React.ReactNode }) => (
    <span className="font-medium text-light-1000 dark:text-dark-1000">
      {children}
    </span>
  );

  if (
    type === "card.updated.label.added" &&
    mergedLabels &&
    mergedLabels.length > 1
  ) {
    const labelList = mergedLabels.join(", ");
    return (
      <Trans>
        added {mergedLabels.length} labels:{" "}
        <TextHighlight>{labelList}</TextHighlight>
      </Trans>
    );
  }

  if (
    type === "card.updated.label.removed" &&
    mergedLabels &&
    mergedLabels.length > 1
  ) {
    const labelList = mergedLabels.join(", ");
    return (
      <Trans>
        removed {mergedLabels.length} labels:{" "}
        <TextHighlight>{labelList}</TextHighlight>
      </Trans>
    );
  }

  const ACTIVITY_TYPE_MAP = {
    "card.created": t`created the card`,
    "card.updated.title": t`updated the title`,
    "card.updated.description": t`updated the description`,
    "card.updated.list": t`moved the card to another list`,
    "card.updated.label.added": t`added a label to the card`,
    "card.updated.label.removed": t`removed a label from the card`,
    "card.updated.member.added": t`added a member to the card`,
    "card.updated.member.removed": t`removed a member from the card`,
    "card.updated.checklist.added": t`added a checklist`,
    "card.updated.checklist.renamed": t`renamed a checklist`,
    "card.updated.checklist.deleted": t`deleted a checklist`,
    "card.updated.checklist.item.added": t`added a checklist item`,
    "card.updated.checklist.item.updated": t`updated a checklist item`,
    "card.updated.checklist.item.completed": t`completed a checklist item`,
    "card.updated.checklist.item.uncompleted": t`marked a checklist item as incomplete`,
    "card.updated.checklist.item.deleted": t`deleted a checklist item`,
    "card.updated.attachment.added": t`added an attachment`,
    "card.updated.attachment.removed": t`removed an attachment`,
    "card.updated.dueDate.added": t`set the due date`,
    "card.updated.dueDate.updated": t`updated the due date`,
    "card.updated.dueDate.removed": t`removed the due date`,
  } as const;

  if (!(type in ACTIVITY_TYPE_MAP)) return null;
  const baseText = ACTIVITY_TYPE_MAP[type as keyof typeof ACTIVITY_TYPE_MAP];

  if (type === "card.updated.title" && toTitle) {
    return (
      <Trans>
        updated the title to <TextHighlight>{truncate(toTitle)}</TextHighlight>
      </Trans>
    );
  }

  if (type === "card.updated.list" && fromList && toList) {
    return (
      <Trans>
        moved the card from <TextHighlight>{truncate(fromList)}</TextHighlight>{" "}
        to
        <TextHighlight>{truncate(toList)}</TextHighlight>
      </Trans>
    );
  }

  if (type === "card.updated.member.added" && displayName) {
    if (isSelf) return <Trans>self-assigned the card</Trans>;

    return (
      <Trans>
        assigned <TextHighlight>{truncate(displayName)}</TextHighlight> to the
        card
      </Trans>
    );
  }

  if (type === "card.updated.member.removed" && displayName) {
    if (isSelf) return <Trans>unassigned themselves from the card</Trans>;

    return (
      <Trans>
        unassigned <TextHighlight>{truncate(displayName)}</TextHighlight> from
        the card
      </Trans>
    );
  }

  if (type === "card.updated.label.added" && label) {
    return (
      <Trans>
        added label <TextHighlight>{truncate(label)}</TextHighlight>
      </Trans>
    );
  }

  if (type === "card.updated.label.removed" && label) {
    return (
      <Trans>
        removed label <TextHighlight>{truncate(label)}</TextHighlight>
      </Trans>
    );
  }

  if (type === "card.updated.checklist.added" && toTitle) {
    return (
      <Trans>
        added checklist <TextHighlight>{truncate(toTitle)}</TextHighlight>
      </Trans>
    );
  }

  if (type === "card.updated.checklist.renamed" && toTitle) {
    return (
      <Trans>
        renamed checklist <TextHighlight>{truncate(toTitle)}</TextHighlight>
      </Trans>
    );
  }

  if (type === "card.updated.checklist.deleted" && fromTitle) {
    return (
      <Trans>
        deleted checklist <TextHighlight>{truncate(fromTitle)}</TextHighlight>
      </Trans>
    );
  }

  if (type === "card.updated.checklist.item.added" && toTitle) {
    return (
      <Trans>
        added checklist item <TextHighlight>{truncate(toTitle)}</TextHighlight>
      </Trans>
    );
  }

  if (type === "card.updated.checklist.item.updated" && toTitle) {
    return (
      <Trans>
        renamed checklist item to{" "}
        <TextHighlight>{truncate(toTitle)}</TextHighlight>
      </Trans>
    );
  }

  if (type === "card.updated.checklist.item.completed" && toTitle) {
    return (
      <Trans>
        completed checklist item{" "}
        <TextHighlight>{truncate(toTitle)}</TextHighlight>
      </Trans>
    );
  }

  if (type === "card.updated.checklist.item.uncompleted" && toTitle) {
    return (
      <Trans>
        marked checklist item <TextHighlight>{truncate(toTitle)}</TextHighlight>{" "}
        as incomplete
      </Trans>
    );
  }

  if (type === "card.updated.checklist.item.deleted" && fromTitle) {
    return (
      <Trans>
        deleted checklist item{" "}
        <TextHighlight>{truncate(fromTitle)}</TextHighlight>
      </Trans>
    );
  }

  if (type === "card.updated.attachment.added") {
    const filename = attachmentName ?? toTitle;
    if (!filename) return baseText;
    return (
      <Trans>
        added an attachment <TextHighlight>{truncate(filename)}</TextHighlight>
      </Trans>
    );
  }

  if (type === "card.updated.attachment.removed") {
    const filename = attachmentName ?? fromTitle;
    if (!filename) return baseText;
    return (
      <Trans>
        removed an attachment{" "}
        <TextHighlight>{truncate(filename)}</TextHighlight>
      </Trans>
    );
  }

  if (type === "card.updated.dueDate.added" && toDueDate) {
    const showYear = !isSameYear(toDueDate, new Date());
    const formattedDate = format(
      toDueDate,
      showYear ? "do MMM yyyy" : "do MMM",
      { locale: dateLocale },
    );
    return (
      <Trans>
        changed the due date to <TextHighlight>{formattedDate}</TextHighlight>
      </Trans>
    );
  }

  if (type === "card.updated.dueDate.updated" && toDueDate) {
    const showYear = !isSameYear(toDueDate, new Date());
    const formattedDate = format(
      toDueDate,
      showYear ? "do MMM yyyy" : "do MMM",
      { locale: dateLocale },
    );
    return (
      <Trans>
        changed the due date to <TextHighlight>{formattedDate}</TextHighlight>
      </Trans>
    );
  }

  if (type === "card.updated.dueDate.removed") {
    return <Trans>removed the due date</Trans>;
  }

  return baseText;
};

const ACTIVITY_ICON_MAP: Partial<Record<ActivityType, React.ReactNode | null>> =
  {
    "card.created": <HiOutlinePlus />,
    "card.updated.title": <HiOutlinePencil />,
    "card.updated.description": <HiOutlinePencil />,
    "card.updated.label.added": <HiOutlineTag />,
    "card.updated.label.removed": <HiOutlineTag />,
    "card.updated.member.added": <HiOutlineUserPlus />,
    "card.updated.member.removed": <HiOutlineUserMinus />,
    "card.updated.checklist.added": <HiOutlinePlus />,
    "card.updated.checklist.renamed": <HiOutlinePencil />,
    "card.updated.checklist.deleted": <HiOutlineTrash />,
    "card.updated.checklist.item.added": <HiOutlinePlus />,
    "card.updated.checklist.item.updated": <HiOutlinePencil />,
    "card.updated.checklist.item.completed": <HiOutlineCheckCircle />,
    "card.updated.checklist.item.uncompleted": <HiOutlineCheckCircle />,
    "card.updated.checklist.item.deleted": <HiOutlineTrash />,
    "card.updated.attachment.added": <HiOutlinePaperClip />,
    "card.updated.attachment.removed": <HiOutlinePaperClip />,
    "card.updated.dueDate.added": <HiOutlineClock />,
    "card.updated.dueDate.updated": <HiOutlineClock />,
    "card.updated.dueDate.removed": <HiOutlineClock />,
  } as const;

const getActivityIcon = (
  type: ActivityType,
  fromIndex?: number | null,
  toIndex?: number | null,
): React.ReactNode | null => {
  if (type === "card.updated.list" && fromIndex != null && toIndex != null) {
    return fromIndex > toIndex ? (
      <HiOutlineArrowLeft />
    ) : (
      <HiOutlineArrowRight />
    );
  }
  return ACTIVITY_ICON_MAP[type] ?? null;
};

const ACTIVITIES_PAGE_SIZE = 20;

const ActivityList = ({
  cardPublicId,
  isLoading: cardIsLoading,
  isAdmin,
  isViewOnly,
}: {
  cardPublicId: string;
  isLoading: boolean;
  isAdmin?: boolean;
  isViewOnly?: boolean;
}) => {
  const { dateLocale } = useLocalisation();
  const { data: sessionData } = authClient.useSession();
  const utils = api.useUtils();
  const [allActivities, setAllActivities] = useState<
    GetCardActivitiesOutput["activities"]
  >([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const isFullyExpandedRef = useRef(false);
  const lastDataUpdatedAtRef = useRef<number | null>(null);

  const {
    data: firstPageData,
    isFetching: isFetchingFirst,
    dataUpdatedAt,
  } = api.card.getActivities.useQuery(
    {
      cardPublicId,
      limit: ACTIVITIES_PAGE_SIZE,
    },
    {
      enabled: !!cardPublicId && cardPublicId.length >= 12,
    },
  );

  useEffect(() => {
    if (firstPageData && dataUpdatedAt !== lastDataUpdatedAtRef.current) {
      lastDataUpdatedAtRef.current = dataUpdatedAt;

      if (isFullyExpandedRef.current && firstPageData.hasMore) {
        setAllActivities(firstPageData.activities);
        setHasMore(firstPageData.hasMore);

        const fetchAllRemaining = async () => {
          let currentActivities = [...firstPageData.activities];
          let currentHasMore = firstPageData.hasMore;

          while (currentHasMore) {
            const lastActivity =
              currentActivities[currentActivities.length - 1];
            if (!lastActivity) break;

            const nextCursor = new Date(lastActivity.createdAt).toISOString();
            const nextPage = await utils.card.getActivities.fetch({
              cardPublicId,
              limit: ACTIVITIES_PAGE_SIZE,
              cursor: nextCursor,
            });

            const existingIds = new Set(
              currentActivities.map((a) => a.publicId),
            );
            const newActivities = nextPage.activities.filter(
              (a: { publicId: string }) => !existingIds.has(a.publicId),
            );
            currentActivities = [...currentActivities, ...newActivities];
            currentHasMore = nextPage.hasMore;
          }

          setAllActivities(currentActivities);
          setHasMore(false);
        };

        void fetchAllRemaining();
      } else {
        setAllActivities(firstPageData.activities);
        setHasMore(firstPageData.hasMore);

        if (!firstPageData.hasMore) {
          isFullyExpandedRef.current = true;
        }
      }
    }
  }, [firstPageData, dataUpdatedAt, cardPublicId, utils.card.getActivities]);

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore || allActivities.length === 0) return;

    const lastActivity = allActivities[allActivities.length - 1];
    if (!lastActivity) return;

    setIsLoadingMore(true);
    try {
      const nextCursor = new Date(lastActivity.createdAt).toISOString();
      const nextPage = await utils.card.getActivities.fetch({
        cardPublicId,
        limit: ACTIVITIES_PAGE_SIZE,
        cursor: nextCursor,
      });

      const existingIds = new Set(allActivities.map((a) => a.publicId));
      const newActivities = nextPage.activities.filter(
        (a: { publicId: string }) => !existingIds.has(a.publicId),
      );
      setAllActivities((prev) => [...prev, ...newActivities]);
      setHasMore(nextPage.hasMore);

      if (!nextPage.hasMore) {
        isFullyExpandedRef.current = true;
      }
    } finally {
      setIsLoadingMore(false);
    }
  };

  const isFetching = isFetchingFirst || isLoadingMore;
  const isLoading =
    cardIsLoading || (isFetchingFirst && allActivities.length === 0);

  return (
    <div className="flex flex-col space-y-4 pt-4">
      {allActivities.map((activity, index) => {
        const activityText = getActivityText({
          type: activity.type,
          toTitle: activity.toTitle,
          fromList: activity.fromList?.name ?? null,
          toList: activity.toList?.name ?? null,
          memberName: activity.member?.user?.name ?? null,
          memberEmail: activity.member?.user?.email ?? null,
          isSelf: activity.member?.user?.id === sessionData?.user.id,
          label: activity.label?.name ?? null,
          fromTitle: activity.fromTitle ?? null,
          fromDueDate: activity.fromDueDate ?? null,
          toDueDate: activity.toDueDate ?? null,
          dateLocale: dateLocale,
          mergedLabels: (activity as ActivityWithMergedLabels).mergedLabels,
          attachmentName:
            (activity as ActivityWithMergedLabels).attachment?.originalFilename ??
            null,
        });

        if (activity.type === "card.updated.comment.added")
          return (
            <Comment
              key={activity.publicId}
              publicId={activity.comment?.publicId}
              cardPublicId={cardPublicId}
              name={activity.user?.name ?? ""}
              email={activity.user?.email ?? ""}
              image={activity.user?.image ?? null}
              isLoading={isLoading}
              createdAt={activity.createdAt.toISOString()}
              comment={activity.comment?.comment}
              isEdited={!!activity.comment?.updatedAt}
              isAuthor={activity.comment?.createdBy === sessionData?.user.id}
              isAdmin={isAdmin ?? false}
              isViewOnly={!!isViewOnly}
            />
          );

        if (!activityText) return null;

        return (
          <div
            key={activity.publicId}
            className="relative flex items-center space-x-2"
          >
            <div className="relative">
              <Avatar
                size="sm"
                name={activity.user?.name ?? ""}
                email={activity.user?.email ?? ""}
                imageUrl={getAvatarUrl(activity.user?.image ?? null) || undefined}
                icon={getActivityIcon(
                  activity.type,
                  activity.fromList?.index,
                  activity.toList?.index,
                )}
                isLoading={isLoading}
              />
              {index !== allActivities.length - 1 && (
                <div className="absolute bottom-[-14px] left-1/2 top-[30px] w-0.5 -translate-x-1/2 bg-light-600 dark:bg-dark-600" />
              )}
            </div>
            <p className="text-sm">
              <span className="font-medium dark:text-dark-1000">{`${getUserDisplayName(activity.user)} `}</span>
              <span className="space-x-1 text-light-900 dark:text-dark-800">
                {activityText}
              </span>
              <span className="mx-1 text-light-900 dark:text-dark-800">·</span>
              <span className="space-x-1 text-light-900 dark:text-dark-800">
                {formatDistanceToNow(new Date(activity.createdAt), {
                  addSuffix: true,
                  locale: dateLocale,
                })}
              </span>
            </p>
          </div>
        );
      })}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={handleLoadMore}
            disabled={isFetching}
            className="text-sm font-medium text-light-900 hover:text-light-1000 disabled:opacity-50 dark:text-dark-800 dark:hover:text-dark-1000"
          >
            {isFetching ? t`Loading...` : t`Load more activities`}
          </button>
        </div>
      )}
    </div>
  );
};

export default ActivityList;
