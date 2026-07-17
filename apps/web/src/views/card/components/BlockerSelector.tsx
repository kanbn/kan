import { t } from "@lingui/core/macro";
import Link from "next/link";
import { useState } from "react";
import { HiMiniPlus, HiXMark } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import { useDebounce } from "~/hooks/useDebounce";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import { invalidateCard } from "~/utils/cardInvalidation";

interface Blocker {
  publicId: string;
  title: string;
  cardNumber: number | null;
  isDone?: boolean;
}

interface BlockerSelectorProps {
  blockers: Blocker[];
  cardPublicId: string;
  cardPrefix?: string | null;
  isLoading?: boolean;
  disabled?: boolean;
}

// Sidebar selector for card-to-card blockers, styled to match the
// List / Labels / Members rows. Selected blockers render as removable chips;
// an inline card-search panel is used to add new ones.
export default function BlockerSelector({
  blockers,
  cardPublicId,
  cardPrefix,
  isLoading = false,
  disabled = false,
}: BlockerSelectorProps) {
  const utils = api.useUtils();
  const { showPopup } = usePopup();
  const { workspace } = useWorkspace();
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounce(query, 300);

  const addOrRemoveBlocker = api.card.addOrRemoveBlocker.useMutation({
    onError: () => {
      showPopup({
        header: t`Unable to update blockers`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      if (cardPublicId) await invalidateCard(utils, cardPublicId);
    },
  });

  const { data: searchResults, isFetching } = api.workspace.search.useQuery(
    {
      workspacePublicId: workspace.publicId,
      query: debouncedQuery,
    },
    {
      enabled: Boolean(workspace.publicId && debouncedQuery.trim().length > 0),
      placeholderData: (previousData) => previousData,
    },
  );

  const existingPublicIds = new Set([
    cardPublicId,
    ...blockers.map((blocker) => blocker.publicId),
  ]);

  const cardResults =
    (searchResults ?? []).filter(
      (
        result,
      ): result is Extract<
        NonNullable<typeof searchResults>[0],
        { type: "card" }
      > =>
        result.type === "card" &&
        !result.isDone && // only cards that are not done can be added as blockers
        !existingPublicIds.has(result.publicId),
    ) ?? [];

  const handleSelect = (blockerPublicId: string) => {
    addOrRemoveBlocker.mutate({
      cardPublicId,
      blockerCardPublicId: blockerPublicId,
    });
    setQuery("");
    setAdding(false);
  };

  const handleRemove = (blockerPublicId: string) => {
    addOrRemoveBlocker.mutate({
      cardPublicId,
      blockerCardPublicId: blockerPublicId,
    });
  };

  if (isLoading) {
    return (
      <div className="h-full w-[175px] animate-pulse rounded-[5px] bg-light-300 dark:bg-dark-300" />
    );
  }

  const blockerLabel = (blocker: Blocker) =>
    blocker.cardNumber != null && cardPrefix
      ? `${cardPrefix}-${blocker.cardNumber}`
      : blocker.title;

  return (
    <div className="w-full">
      {blockers.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1">
          {blockers.map((blocker) => (
            <span
              key={blocker.publicId}
              className={twMerge(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
                blocker.isDone
                  ? "bg-gray-100 text-gray-600 line-through opacity-60 dark:bg-gray-800 dark:text-gray-400"
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
              )}
            >
              <Link
                href={`/cards/${blocker.publicId}`}
                className="max-w-[120px] truncate hover:underline"
              >
                {blockerLabel(blocker)}
              </Link>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(blocker.publicId)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-red-200 dark:hover:bg-red-800/50"
                  aria-label={t`Remove blocker`}
                >
                  <HiXMark className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
          {!disabled && !adding && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-0.5 rounded-[5px] border-[1px] border-dashed border-light-300 px-1.5 py-0.5 text-xs text-light-900 hover:border-light-400 hover:bg-light-100 dark:border-dark-300 dark:text-dark-700 dark:hover:border-dark-400 dark:hover:bg-dark-100"
            >
              <HiMiniPlus className="h-3 w-3" />
              {t`Add blocker`}
            </button>
          )}
        </div>
      ) : (
        !disabled &&
        !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex h-full w-full items-center rounded-[5px] border-[1px] border-light-50 pl-2 text-left text-sm text-neutral-900 hover:border-light-300 hover:bg-light-200 dark:border-dark-50 dark:text-dark-1000 dark:hover:border-dark-200 dark:hover:bg-dark-100"
          >
            <HiMiniPlus size={22} className="pr-2" />
            {t`Add blocker`}
          </button>
        )
      )}

      {adding && (
        <div className="relative w-full">
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setAdding(false);
                setQuery("");
              }
            }}
            placeholder={t`Search for a card…`}
            className="w-full rounded-md border-[1px] border-light-300 bg-light-50 px-2 py-1 text-xs text-light-1000 focus:border-light-400 focus:outline-none dark:border-dark-300 dark:bg-dark-50 dark:text-dark-1000"
          />
          {debouncedQuery.trim().length > 0 && (
            <div className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-md border-[1px] border-light-300 bg-light-50 shadow-lg dark:border-dark-300 dark:bg-dark-50">
              {isFetching && cardResults.length === 0 && (
                <div className="px-3 py-2 text-xs text-light-900 dark:text-dark-700">
                  {t`Searching…`}
                </div>
              )}
              {!isFetching && cardResults.length === 0 && (
                <div className="px-3 py-2 text-xs text-light-900 dark:text-dark-700">
                  {t`No cards found`}
                </div>
              )}
              {cardResults.map((result) => (
                <button
                  type="button"
                  key={result.publicId}
                  onClick={() => handleSelect(result.publicId)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-light-200 dark:hover:bg-dark-200"
                >
                  <span className="truncate text-light-1000 dark:text-dark-1000">
                    {result.title}
                  </span>
                  {result.cardNumber != null && cardPrefix && (
                    <span className="ml-auto flex-shrink-0 text-light-700 dark:text-dark-700">
                      {cardPrefix}-{result.cardNumber}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setAdding(false);
              setQuery("");
            }}
            className="mt-1 text-xs text-light-900 hover:underline dark:text-dark-700"
          >
            {t`Cancel`}
          </button>
        </div>
      )}
    </div>
  );
}
