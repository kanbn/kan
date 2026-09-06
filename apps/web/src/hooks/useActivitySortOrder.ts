import { useSyncExternalStore } from "react";

export type ActivitySortOrder = "oldest" | "newest";

const DEFAULT_ACTIVITY_SORT_ORDER: ActivitySortOrder = "oldest";
const STORAGE_KEY = "kan_activity-sort-order";
const CHANGE_EVENT = `${STORAGE_KEY}-change`;

const isActivitySortOrder = (
  value: string | null,
): value is ActivitySortOrder => value === "oldest" || value === "newest";

const getSnapshot = (): ActivitySortOrder => {
  try {
    const storedOrder = localStorage.getItem(STORAGE_KEY);
    return isActivitySortOrder(storedOrder)
      ? storedOrder
      : DEFAULT_ACTIVITY_SORT_ORDER;
  } catch {
    return DEFAULT_ACTIVITY_SORT_ORDER;
  }
};

const subscribe = (onStoreChange: () => void) => {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
  };
};

export const setActivitySortOrder = (order: ActivitySortOrder) => {
  try {
    localStorage.setItem(STORAGE_KEY, order);
  } catch {
    // The hook falls back to the default when storage is unavailable.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
};

export const useActivitySortOrder = () =>
  useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => DEFAULT_ACTIVITY_SORT_ORDER,
  );
