import { useEffect, useState } from "react";

const STORAGE_KEY_PREFIX = "kan_collapsed-lists";

interface CollapsedListsState {
  boardPublicId: string | null;
  listPublicIds: Set<string>;
}

export const parseCollapsedListIds = (value: string | null): string[] => {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return Array.from(
      new Set(
        parsed.filter((item): item is string => typeof item === "string"),
      ),
    );
  } catch {
    return [];
  }
};

const getStorageKey = (boardPublicId: string) =>
  `${STORAGE_KEY_PREFIX}:${boardPublicId}`;

export const useCollapsedLists = (boardPublicId: string | null) => {
  const [state, setState] = useState<CollapsedListsState>({
    boardPublicId: null,
    listPublicIds: new Set(),
  });

  useEffect(() => {
    if (!boardPublicId) {
      setState({ boardPublicId: null, listPublicIds: new Set() });
      return;
    }

    let listPublicIds: string[] = [];
    try {
      listPublicIds = parseCollapsedListIds(
        localStorage.getItem(getStorageKey(boardPublicId)),
      );
    } catch {
      // Keep the default when storage is unavailable.
    }

    setState({ boardPublicId, listPublicIds: new Set(listPublicIds) });
  }, [boardPublicId]);

  useEffect(() => {
    if (!boardPublicId || state.boardPublicId !== boardPublicId) return;

    try {
      localStorage.setItem(
        getStorageKey(boardPublicId),
        JSON.stringify(Array.from(state.listPublicIds)),
      );
    } catch {
      // The preference remains available for the current page session.
    }
  }, [boardPublicId, state]);

  const toggleList = (listPublicId: string) => {
    setState((current) => {
      const listPublicIds =
        current.boardPublicId === boardPublicId
          ? new Set(current.listPublicIds)
          : new Set<string>();

      if (listPublicIds.has(listPublicId)) {
        listPublicIds.delete(listPublicId);
      } else {
        listPublicIds.add(listPublicId);
      }

      return { boardPublicId, listPublicIds };
    });
  };

  return {
    collapsedListIds:
      state.boardPublicId === boardPublicId
        ? state.listPublicIds
        : new Set<string>(),
    toggleList,
  };
};
