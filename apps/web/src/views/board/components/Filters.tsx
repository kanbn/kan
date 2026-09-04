import { useRouter } from "next/router";
import { t } from "@lingui/core/macro";
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

const Filters = ({
  position = "right",
  labels,
  members,
  lists,
  isLoading,
}: {
  position?: "left" | "right";
  labels: Label[];
  members: Member[];
  lists: List[];
  isLoading: boolean;
}) => {
  const router = useRouter();

  const clearFilters = async () => {
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

  const filterCounts = {
    members: formatToArray(router.query.members).length,
    labels: formatToArray(router.query.labels).length,
    lists: formatToArray(router.query.lists).length,
    dueDate: formatToArray(router.query.dueDate).length,
  };

  const groups = [
    ...(formattedMembers.length
      ? [
          {
            key: "members",
            label: t`Members`,
            icon: <HiOutlineUserCircle size={16} />,
            items: formattedMembers,
            selectedCount: filterCounts.members,
          },
        ]
      : []),
    {
      key: "labels",
      label: t`Labels`,
      icon: <HiOutlineTag size={16} />,
      items: formattedLabels,
      selectedCount: filterCounts.labels,
    },
    ...(formattedLists.length
      ? [
          {
            key: "lists",
            label: t`Lists`,
            icon: <HiOutlineSquare3Stack3D size={16} />,
            items: formattedLists,
            selectedCount: filterCounts.lists,
          },
        ]
      : []),
    {
      key: "dueDate",
      label: t`Due date`,
      icon: <HiOutlineClock size={16} />,
      items: dueDateItems,
      selectedCount: filterCounts.dueDate,
    },
  ];

  const handleSelect = async (
    groupKey: string | null,
    item: { key: string },
  ) => {
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

  const numOfFilters = Object.values(filterCounts).reduce(
    (total, count) => total + count,
    0,
  );

  return (
    <div className="relative">
      <CheckboxDropdown
        groups={groups}
        handleSelect={handleSelect}
        menuSpacing="md"
        position={position}
        backLabel={t`Back`}
        footer={
          numOfFilters > 0 ? (
            <button
              type="button"
              onClick={clearFilters}
              className="flex w-full items-center rounded-[5px] p-2 text-[12px] font-semibold text-dark-900 hover:bg-light-200 dark:hover:bg-dark-300"
            >
              <HiMiniXMark size={16} className="mr-2" aria-hidden="true" />
              {t`Clear filters`}
            </button>
          ) : undefined
        }
      >
        <Button
          variant="secondary"
          disabled={isLoading}
          iconLeft={<IoFilterOutline />}
        >
          {t`Filter`}
        </Button>
        {numOfFilters > 0 && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-[8px] -top-[8px] flex h-5 w-5 items-center justify-center rounded-full border-2 border-light-100 bg-light-1000 text-[8px] font-[700] text-light-600 dark:border-dark-50 dark:bg-dark-1000 dark:text-dark-600"
          >
            {numOfFilters}
          </span>
        )}
      </CheckboxDropdown>
    </div>
  );
};

export default Filters;
