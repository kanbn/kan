import { useRouter } from "next/router";
import { t } from "@lingui/core/macro";
import { useState } from "react";
import { HiOutlineMinusCircle, HiPlus, HiXMark } from "react-icons/hi2";

import { useDebounce } from "~/hooks/useDebounce";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import { invalidateCard } from "~/utils/cardInvalidation";

interface Blocker {
  publicId: string;
  title: string;
  cardNumber: number | null;
}

interface BlockedByProps {
  blockers: Blocker[];
  cardPublicId: string;
  cardPrefix?: string | null;
  viewOnly?: boolean;
}

export default function BlockedBy({
  blockers,
  cardPublicId,
  cardPrefix,
  viewOnly = false,
}: BlockedByProps) {
  const router = useRouter();
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
      > => result.type === "card" && !existingPublicIds.has(result.publicId),
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

  // Hide the section entirely when there's nothing to show and no add affordance.
  if (blockers.length === 0 && viewOnly) return null;

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center gap-2 font-medium text-light-1000 dark:text-dark-1000">
        <HiOutlineMinusCircle className="h-4 w-4 text-light-900 dark:text-dark-700" />
        <span className="text-sm">{t`Blocked by`}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {blockers.map((blocker) => (
          <span
            key={blocker.publicId}
            className="inline-flex items-center gap-1 rounded-md border-[1px] border-light-300 bg-light-100 px-2 py-1 text-xs text-light-1000 hover:border-light-400 dark:border-dark-300 dark:bg-dark-100 dark:text-dark-1000 dark:hover:border-dark-400"
          >
            <button
              type="button"
              onClick={() => void router.push(`/cards/${blocker.publicId}`)}
              className="flex items-center gap-1 truncate hover:underline"
            >
              {blocker.cardNumber != null && cardPrefix && (
                <span className="text-light-700 dark:text-dark-700">
                  {cardPrefix}-{blocker.cardNumber}
                </span>
              )}
              <span className="truncate">{blocker.title}</span>
            </button>
            {!viewOnly && (
              <button
                type="button"
                onClick={() => handleRemove(blocker.publicId)}
                className="rounded p-0.5 text-light-900 hover:bg-light-200 hover:text-light-1000 dark:text-dark-700 dark:hover:bg-dark-200"
                aria-label={t`Remove blocker`}
              >
                <HiXMark className="h-3.5 w-3.5" />
              </button>
            )}
          </span>
        ))}

        {!viewOnly && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 rounded-md border-[1px] border-dashed border-light-300 px-2 py-1 text-xs text-light-900 hover:border-light-400 hover:bg-light-100 dark:border-dark-300 dark:text-dark-700 dark:hover:border-dark-400 dark:hover:bg-dark-100"
          >
            <HiPlus className="h-3.5 w-3.5" />
            {t`Add blocker`}
          </button>
        )}

        {!viewOnly && adding && (
          <div className="relative w-full max-w-xs">
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
              <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border-[1px] border-light-300 bg-light-50 shadow-lg dark:border-dark-300 dark:bg-dark-50">
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
    </div>
  );
}
