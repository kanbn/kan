import { useRouter } from "next/router";
import { t } from "@lingui/core/macro";
import { authClient } from "@kan/auth/client";
import {
  HiMiniXMark,
  HiOutlineClock,
  HiOutlineSquare3Stack3D,
  HiOutlineTag,
  HiOutlineUserCircle,
} from "react-icons/hi2";
import { IoFilterOutline } from "react-icons/io5";

import Avatar from "~/components/Avatar";
import Button from "~/components/Button";
import CheckboxDropdown from "~/components/CheckboxDropdown";
import LabelIcon from "~/components/LabelIcon";
import {
  formatMemberDisplayName,
  formatToArray,
  getAvatarUrl,
} from "~/utils/helpers";

interface Member {
  publicId: string;
  user: {
    name: string | null;
    image: string | null;
    email: string;
  } | null;
}

interface Label {
  publicId: string;
  name: string;
  colourCode: string | null;
}

interface List {
  publicId: string;
  name: string;
}

interface FiltersProps {
  position?: "left" | "right";
  labels: Label[];
  members: Member[];
  lists: List[];
  isLoading: boolean;
}

const Filters = ({
  position = "right",
  labels,
  members,
  lists,
  isLoading,
}: FiltersProps) => {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const currentUserMember = members.find(
    (m) => m.user?.email === session?.user?.email,
  );
  const currentUserMemberPublicId = currentUserMember?.publicId;
  const membersQuery = formatToArray(router.query.members);
  const isAssignedToMeActive =
    !!currentUserMemberPublicId &&
    membersQuery.length === 1 &&
    membersQuery[0] === currentUserMemberPublicId;

  const clearFilters = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await router.push({
        pathname: router.pathname,
        query: {
          ...router.query,
          members: [],
          labels: [],
          lists: [],
          dueDate: [],
        },
      });
    } catch (error) {
      console.error(error);
    }
  };

  const formattedMembers = members.map((member) => ({
    key: member.publicId,
    value: formatMemberDisplayName(
      member.user?.name ?? null,
      member.user?.email ?? null,
    ),
    selected: !!router.query.members?.includes(member.publicId),
    leftIcon: (
      <Avatar
        size="xs"
        name={member.user?.name ?? ""}
        imageUrl={
          member.user?.image ? getAvatarUrl(member.user.image) : undefined
        }
        email={member.user?.email ?? ""}
      />
    ),
  }));

  const formattedLabels = labels.map((label) => ({
    key: label.publicId,
    value: label.name,
    selected: !!router.query.labels?.includes(label.publicId),
    leftIcon: <LabelIcon colourCode={label.colourCode} />,
  }));

  const formattedLists = lists.map((list) => ({
    key: list.publicId,
    value: list.name,
    selected: !!router.query.lists?.includes(list.publicId),
  }));

  const dueDateItems = [
    {
      key: "overdue",
      value: t`Overdue`,
      selected: !!router.query.dueDate?.includes("overdue"),
    },
    {
      key: "today",
      value: t`Due today`,
      selected: !!router.query.dueDate?.includes("today"),
    },
    {
      key: "tomorrow",
      value: t`Due tomorrow`,
      selected: !!router.query.dueDate?.includes("tomorrow"),
    },
    {
      key: "next-week",
      value: t`Due next week`,
      selected: !!router.query.dueDate?.includes("next-week"),
    },
    {
      key: "next-month",
      value: t`Due next month`,
      selected: !!router.query.dueDate?.includes("next-month"),
    },
    {
      key: "no-due-date",
      value: t`No dates`,
      selected: !!router.query.dueDate?.includes("no-due-date"),
    },
  ];

  const topLevelItems =
    currentUserMemberPublicId
      ? [
          {
            key: "me",
            value: t`Assigned to me`,
            selected: isAssignedToMeActive,
            leftIcon: (
              <Avatar
                size="xs"
                name={currentUserMember.user?.name ?? ""}
                imageUrl={
                  currentUserMember.user?.image
                    ? getAvatarUrl(currentUserMember.user.image)
                    : undefined
                }
                email={currentUserMember.user?.email ?? ""}
              />
            ),
          },
        ]
      : undefined;

  const groups = [
    ...(formattedMembers.length
      ? [
          {
            key: "members",
            label: t`Members`,
            icon: <HiOutlineUserCircle size={16} />,
            items: formattedMembers,
          },
        ]
      : []),
    {
      key: "labels",
      label: t`Labels`,
      icon: <HiOutlineTag size={16} />,
      items: formattedLabels,
    },
    ...(formattedLists.length
      ? [
          {
            key: "lists",
            label: t`Lists`,
            icon: <HiOutlineSquare3Stack3D size={16} />,
            items: formattedLists,
          },
        ]
      : []),
    {
      key: "dueDate",
      label: t`Due date`,
      icon: <HiOutlineClock size={16} />,
      items: dueDateItems,
    },
  ];

  const handleSelect = async (
    groupKey: string | null,
    item: { key: string },
  ) => {
    if (
      groupKey === null &&
      item.key === "me" &&
      currentUserMemberPublicId
    ) {
      try {
        await router.push({
          pathname: router.pathname,
          query: {
            ...router.query,
            members: isAssignedToMeActive ? [] : [currentUserMemberPublicId],
          },
        });
      } catch (error) {
        console.error(error);
      }
      return;
    }
    if (groupKey === null) return;
    const currentQuery = router.query[groupKey] ?? [];
    const formattedCurrentQuery = Array.isArray(currentQuery)
      ? currentQuery
      : [currentQuery];

    const updatedQuery = formattedCurrentQuery.includes(item.key)
      ? formattedCurrentQuery.filter((key) => key !== item.key)
      : [...formattedCurrentQuery, item.key];

    try {
      await router.push({
        pathname: router.pathname,
        query: { ...router.query, [groupKey]: updatedQuery },
      });
    } catch (error) {
      console.error(error);
    }
  };

  const numOfFilters = [
    ...formatToArray(router.query.members),
    ...formatToArray(router.query.labels),
    ...formatToArray(router.query.lists),
    ...formatToArray(router.query.dueDate),
  ].length;

  return (
    <div className="relative">
      <CheckboxDropdown
        items={topLevelItems}
        groups={groups}
        handleSelect={handleSelect}
        menuSpacing="md"
        position={position}
      >
        <Button
          variant="secondary"
          disabled={isLoading}
          iconLeft={<IoFilterOutline />}
        >
          {t`Filter`}
        </Button>
        {numOfFilters > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            aria-label={t`Clear filters`}
            className="group absolute -right-[8px] -top-[8px] flex h-5 w-5 items-center justify-center rounded-full border-2 border-light-100 bg-light-1000 text-[8px] font-[700] text-light-600 dark:border-dark-50 dark:bg-dark-1000 dark:text-dark-600"
          >
            <span className="group-hover:hidden">{numOfFilters}</span>
            <span className="hidden text-light-50 group-hover:inline dark:text-dark-50">
              <HiMiniXMark size={12} />
            </span>
          </button>
        )}
      </CheckboxDropdown>
    </div>
  );
};

export default Filters;
