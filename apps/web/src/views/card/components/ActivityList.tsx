import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { formatDistanceToNow } from "date-fns";
import { de, enGB, es, fr, it, nl } from "date-fns/locale";
import {
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
  HiOutlineCheckCircle,
  HiOutlinePencil,
  HiOutlinePlus,
  HiOutlineTag,
  HiOutlineTrash,
  HiOutlineUserMinus,
  HiOutlineUserPlus,
} from "react-icons/hi2";

import type { GetCardByIdOutput } from "@kan/api/types";
import { authClient } from "@kan/auth/client";

import Avatar from "~/components/Avatar";
import { useLocalisation } from "~/hooks/useLocalisation";
import Comment from "./Comment";

type ActivityType =
  NonNullable<GetCardByIdOutput>["activities"][number]["type"];

const dateLocaleMap = {
  en: enGB,
  fr: fr,
  de: de,
  es: es,
  it: it,
  nl: nl,
} as const;

const truncate = (value: string | null, maxLength = 50) => {
  if (!value) return value;
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
};

const getActivityText = ({
  type,
  toTitle,
  fromList,
  toList,
  memberName,
  isSelf,
  label,
  fromTitle,
}: {
  type: ActivityType;
  toTitle: string | null;
  fromList: string | null;
  toList: string | null;
  memberName: string | null;
  isSelf: boolean;
  label: string | null;
  fromTitle?: string | null;
}) => {
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
    "card.updated.customfield.added": t`added a custom field`,
    "card.updated.customfield.updated": t`updated a custom field`,
    "card.updated.customfield.removed": t`removed a custom field`,
  } as const;

  if (!(type in ACTIVITY_TYPE_MAP)) return null;
  const baseText = ACTIVITY_TYPE_MAP[type as keyof typeof ACTIVITY_TYPE_MAP];

  const TextHighlight = ({ children }: { children: React.ReactNode }) => (
    <span className="font-medium text-light-1000 dark:text-dark-1000">
      {children}
    </span>
  );

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

  if (type === "card.updated.member.added" && memberName) {
    if (isSelf) return <Trans>self-assigned the card</Trans>;

    return (
      <Trans>
        assigned <TextHighlight>{truncate(memberName)}</TextHighlight> to the
        card
      </Trans>
    );
  }

  if (type === "card.updated.member.removed" && memberName) {
    if (isSelf) return <Trans>unassigned themselves from the card</Trans>;

    return (
      <Trans>
        unassigned <TextHighlight>{truncate(memberName)}</TextHighlight> from
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

const ActivityList = ({
  activities,
  cardPublicId,
  isLoading,
  isAdmin,
  isViewOnly,
}: {
  activities: NonNullable<GetCardByIdOutput>["activities"];
  cardPublicId: string;
  isLoading: boolean;
  isAdmin?: boolean;
  isViewOnly?: boolean;
}) => {
  const { data } = authClient.useSession();
  const { locale } = useLocalisation();

  const currentDateLocale = dateLocaleMap[locale] || enGB;

  return (
    <div className="flex flex-col space-y-4 pt-4">
      {activities.map((activity, index) => {
        const activityText = getActivityText({
          type: activity.type,
          toTitle: activity.toTitle,
          fromList: activity.fromList?.name ?? null,
          toList: activity.toList?.name ?? null,
          memberName: activity.member?.user?.name ?? null,
          isSelf: activity.member?.user?.id === data?.user.id,
          label: activity.label?.name ?? null,
          fromTitle: activity.fromTitle ?? null,
        });

        if (activity.type === "card.updated.comment.added")
          return (
            <Comment
              key={activity.publicId}
              publicId={activity.comment?.publicId}
              cardPublicId={cardPublicId}
              name={activity.user?.name ?? ""}
              email={activity.user?.email ?? ""}
              isLoading={isLoading}
              createdAt={activity.createdAt.toISOString()}
              comment={activity.comment?.comment}
              isEdited={!!activity.comment?.updatedAt}
              isAuthor={activity.comment?.createdBy === data?.user.id}
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
                icon={getActivityIcon(
                  activity.type,
                  activity.fromList?.index,
                  activity.toList?.index,
                )}
                isLoading={isLoading}
              />
              {index !== activities.length - 1 &&
                activities[index + 1]?.type !==
                  "card.updated.comment.added" && (
                  <div className="absolute bottom-[-14px] left-1/2 top-[30px] w-0.5 -translate-x-1/2 bg-light-600 dark:bg-dark-600" />
                )}
            </div>
            <p className="text-sm">
              <span className="font-medium dark:text-dark-1000">{`${activity.user?.name} `}</span>
              <span className="space-x-1 text-light-900 dark:text-dark-800">
                {activityText}
              </span>
              <span className="mx-1 text-light-900 dark:text-dark-800">·</span>
              <span className="space-x-1 text-light-900 dark:text-dark-800">
                {formatDistanceToNow(new Date(activity.createdAt), {
                  addSuffix: true,
                  locale: currentDateLocale,
                })}
              </span>
            </p>
          </div>
        );
      })}
    </div>
  );
};

export default ActivityList;
