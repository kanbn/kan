import { useRouter } from "next/router";
import { t } from "@lingui/core/macro";
import { useState } from "react";
import {
  HiMiniXMark,
  HiOutlineClock,
  HiOutlineSquare3Stack3D,
  HiOutlineTableCells,
  HiOutlineTag,
  HiOutlineUserCircle,
} from "react-icons/hi2";
import { IoFilterOutline } from "react-icons/io5";

import type { ScalarCustomFieldFilter } from "./custom-fields/custom-field-filters";
import type { RouterOutputs } from "~/utils/api";
import Avatar from "~/components/Avatar";
import Button from "~/components/Button";
import CheckboxDropdown from "~/components/CheckboxDropdown";
import LabelIcon from "~/components/LabelIcon";
import {
  formatMemberDisplayName,
  formatToArray,
  getAvatarUrl,
} from "~/utils/helpers";
import CustomFieldFilterPanel from "./custom-fields/custom-field-filter-panel";
import {
  countCustomFieldFilters,
  decodeScalarFilter,
  encodeCheckboxFilter,
  encodeScalarFilter,
  encodeSelectFilter,
  replaceCustomFieldFilter,
} from "./custom-fields/custom-field-filters";

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

type CustomFieldDefinition =
  RouterOutputs["board"]["byId"]["customFields"][number];

const Filters = ({
  position = "right",
  labels,
  members,
  lists,
  customFields,
  isLoading,
}: {
  position?: "left" | "right";
  labels: Label[];
  members: Member[];
  lists: List[];
  customFields: CustomFieldDefinition[];
  isLoading: boolean;
}) => {
  const router = useRouter();
  const [activeScalarFieldPublicId, setActiveScalarFieldPublicId] = useState<
    string | null
  >(null);

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
          customFields: [],
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
  const selectedCustomFieldFilters = formatToArray(router.query.customFields);
  const summarizeScalarFilter = (filter: ScalarCustomFieldFilter | null) => {
    if (!filter) return t`Set filter`;
    if (filter.type === "text") {
      const value =
        filter.contains.length > 24
          ? `${filter.contains.slice(0, 24)}…`
          : filter.contains;
      return `${t`Contains`}: ${value}`;
    }
    if (filter.type === "number")
      return filter.operator === "equals"
        ? `${t`Equals`}: ${filter.value}`
        : `${filter.min ?? "…"} – ${filter.max ?? "…"}`;
    const formatDate = (value?: string) =>
      value ? new Date(value).toLocaleDateString() : "…";
    return filter.operator === "range"
      ? `${formatDate(filter.from)} – ${formatDate(filter.to)}`
      : `${filter.operator === "before" ? t`Before` : t`After`}: ${formatDate(
          filter.value,
        )}`;
  };
  const customFieldGroups = customFields.flatMap((field) => {
    if (field.type === "select") {
      const items = field.options.map((option) => {
        const key = encodeSelectFilter(field.publicId, option.publicId);
        return {
          key,
          value: option.isArchived
            ? `${option.name} (${t`Archived`})`
            : option.name,
          selected: selectedCustomFieldFilters.includes(key),
          leftIcon: (
            <span
              className={`h-2.5 w-2.5 rounded-full border border-black/10 ${
                option.isArchived ? "opacity-50" : ""
              }`}
              style={{ backgroundColor: option.colourCode ?? "transparent" }}
            />
          ),
        };
      });

      return items.length > 0
        ? [
            {
              key: `customField:${field.publicId}`,
              label: field.name,
              icon: <HiOutlineTableCells size={16} />,
              items,
              selectedCount: items.filter((item) => item.selected).length,
            },
          ]
        : [];
    }

    if (field.type === "checkbox") {
      const items = [
        { key: "checked" as const, value: t`Checked` },
        { key: "unchecked" as const, value: t`Unchecked or not set` },
      ].map((item) => {
        const key = encodeCheckboxFilter(field.publicId, item.key);
        return {
          key,
          value: item.value,
          selected: selectedCustomFieldFilters.includes(key),
        };
      });

      return [
        {
          key: `customField:${field.publicId}`,
          label: field.name,
          icon: <HiOutlineTableCells size={16} />,
          items,
          selectedCount: items.filter((item) => item.selected).length,
        },
      ];
    }

    const filter = decodeScalarFilter(
      field.publicId,
      selectedCustomFieldFilters,
    );
    return [
      {
        key: `customFieldScalar:${field.publicId}`,
        label: field.name,
        icon: <HiOutlineTableCells size={16} />,
        items: [
          {
            key: `editCustomFieldScalar:${field.publicId}`,
            value: summarizeScalarFilter(filter),
          },
        ],
        selectedCount: filter ? 1 : 0,
      },
    ];
  });

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
    ...customFieldGroups,
  ];

  const handleSelect = async (
    groupKey: string | null,
    item: { key: string },
  ) => {
    if (groupKey === null) return;
    if (groupKey.startsWith("customFieldScalar:")) {
      setActiveScalarFieldPublicId(groupKey.split(":")[1] ?? null);
      return;
    }
    const queryKey = groupKey.startsWith("customField:")
      ? "customFields"
      : groupKey;
    const currentQuery = router.query[queryKey] ?? [];
    const formattedCurrentQuery = Array.isArray(currentQuery)
      ? currentQuery
      : [currentQuery];

    const updatedQuery = formattedCurrentQuery.includes(item.key)
      ? formattedCurrentQuery.filter((key) => key !== item.key)
      : [...formattedCurrentQuery, item.key];

    try {
      await router.push({
        pathname: router.pathname,
        query: { ...router.query, [queryKey]: updatedQuery },
      });
    } catch (error) {
      console.error(error);
    }
  };

  const updateScalarFilter = async (
    fieldPublicId: string,
    replacement: string[],
  ) => {
    await router.push({
      pathname: router.pathname,
      query: {
        ...router.query,
        customFields: replaceCustomFieldFilter(
          selectedCustomFieldFilters,
          fieldPublicId,
          replacement,
        ),
      },
    });
  };

  const numOfFilters =
    Object.values(filterCounts).reduce((total, count) => total + count, 0) +
    countCustomFieldFilters(selectedCustomFieldFilters);

  const activeScalarField = customFields.find(
    (field) =>
      field.publicId === activeScalarFieldPublicId &&
      (field.type === "text" ||
        field.type === "number" ||
        field.type === "date"),
  ) as
    | {
        publicId: string;
        name: string;
        type: "text" | "number" | "date";
      }
    | undefined;

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
            className="pointer-events-none absolute -right-2.5 -top-2.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-light-100 bg-light-1000 text-[8px] font-[700] leading-none text-light-600 dark:border-dark-50 dark:bg-dark-1000 dark:text-dark-600"
          >
            {numOfFilters}
          </span>
        )}
      </CheckboxDropdown>
      {activeScalarField && (
        <CustomFieldFilterPanel
          key={`${activeScalarField.publicId}:${selectedCustomFieldFilters.join(
            ",",
          )}`}
          field={activeScalarField}
          initialFilter={decodeScalarFilter(
            activeScalarField.publicId,
            selectedCustomFieldFilters,
          )}
          onApply={(filter) =>
            updateScalarFilter(
              activeScalarField.publicId,
              encodeScalarFilter(activeScalarField.publicId, filter),
            )
          }
          onClear={() => updateScalarFilter(activeScalarField.publicId, [])}
          onClose={() => setActiveScalarFieldPublicId(null)}
        />
      )}
    </div>
  );
};

export default Filters;
