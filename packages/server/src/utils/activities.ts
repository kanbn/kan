import type { PaginatedActivitiesResult } from "@kan/db/repository/cardActivity.repo";
import type { ActivityType } from "@kan/db/schema";

type ActivityBase = PaginatedActivitiesResult["activities"][number];

interface Activity extends ActivityBase {
  mergeCount?: number; // number of activities merged into this one
  mergedLabels?: string[]; // list of label names when merging label activities
}

// types that can be merged with simple count
const MERGEABLE_COUNT_TYPES: readonly ActivityType[] = [
  "card.updated.description",
];

// types that merge with a list of items
const MERGEABLE_LIST_TYPES: readonly ActivityType[] = [
  "card.updated.label.added",
  "card.updated.label.removed",
];

const MERGE_TIME_WINDOW_MS = 5 * 60 * 1000; // 5 minutes window for merging activities

export function mergeActivities(activities: Activity[]): Activity[] {
  if (activities.length === 0) return [];

  const merged: Activity[] = [];
  let i = 0;

  while (i < activities.length) {
    const current = activities[i];
    if (!current) {
      i++;
      continue;
    }

    const currentType = current.type;

    const isCountMergeable = MERGEABLE_COUNT_TYPES.includes(currentType);
    const isListMergeable = MERGEABLE_LIST_TYPES.includes(currentType);
    const canMerge = (isCountMergeable || isListMergeable) && current.user?.id;

    if (!canMerge) {
      merged.push(current);
      i++;
      continue;
    }

    const group: Activity[] = [current];
    let j = i + 1;

    while (j < activities.length) {
      const next = activities[j];
      if (!next) break;

      const timeDiff =
        new Date(next.createdAt).getTime() -
        new Date(current.createdAt).getTime();

      if (
        next.type === current.type &&
        next.user?.id === current.user?.id &&
        timeDiff >= 0 && // next is newer or same time
        timeDiff <= MERGE_TIME_WINDOW_MS
      ) {
        group.push(next);
        j++;
      } else {
        break;
      }
    }

    if (group.length > 1) {
      const oldest = group[0];
      const latest = group[group.length - 1];

      if (oldest && latest) {
        if (isListMergeable) {
          const labelNames = group
            .map((a) => a.label?.name)
            .filter((name): name is string => !!name);

          merged.push({
            ...oldest,
            createdAt: oldest.createdAt,
            mergeCount: group.length,
            mergedLabels: labelNames,
          });
        } else {
          merged.push({
            ...oldest,
            createdAt: oldest.createdAt,
            toDescription: latest.toDescription,
            fromDescription: oldest.fromDescription,
            mergeCount: group.length,
          });
        }
      } else {
        merged.push(current);
      }
    } else {
      merged.push(current);
    }

    i = j;
  }

  return merged;
}
