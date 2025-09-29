import Link from "next/link";
import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  Dialog,
  DialogBackdrop,
  DialogPanel,
} from "@headlessui/react";
import { t } from "@lingui/macro";
import { useState } from "react";
import { HiMagnifyingGlass } from "react-icons/hi2";

import { useDebounce } from "~/hooks/useDebounce";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";

type SearchResult =
  | {
      publicId: string;
      title: string;
      description: string | null;
      slug: string;
      type: "board";
    }
  | {
      publicId: string;
      title: string;
      description: string | null;
      boardPublicId: string;
      boardName: string;
      listName: string;
      type: "card";
    };

export default function CommandPallette({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const { workspace } = useWorkspace();

  // Debounce to avoid too many reqs
  const [debouncedQuery] = useDebounce(query, 500);

  const {
    data: searchResults,
    isLoading,
    isFetched,
  } = api.workspace.search.useQuery(
    {
      workspacePublicId: workspace.publicId,
      query: debouncedQuery,
    },
    {
      enabled: Boolean(workspace.publicId && debouncedQuery.trim().length > 0),
    },
  );

  const results = (searchResults ?? []) as SearchResult[];
  const hasSearched = Boolean(debouncedQuery.trim().length > 0 && isFetched);

  return (
    <Dialog
      className="relative z-50"
      open={isOpen}
      onClose={() => {
        onClose();
        setQuery("");
      }}
    >
      <DialogBackdrop
        transition
        className="data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in fixed inset-0 bg-light-50 bg-opacity-40 transition-opacity dark:bg-dark-50 dark:bg-opacity-40"
      />

      <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
        <div className="flex min-h-full items-start justify-center p-4 text-center sm:items-start sm:p-0">
          <DialogPanel
            transition
            className="data-closed:opacity-0 data-closed:translate-y-4 data-closed:sm:translate-y-0 data-closed:sm:scale-95 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in relative mt-[25vh] w-full max-w-[550px] transform divide-y divide-gray-100 overflow-hidden rounded-lg border border-light-600 bg-white/90 shadow-3xl-light backdrop-blur-[6px] transition-all dark:divide-white/10 dark:border-dark-600 dark:bg-dark-100/90 dark:shadow-3xl-dark"
          >
            <Combobox>
              <div className="grid grid-cols-1">
                <ComboboxInput
                  autoFocus
                  className="col-start-1 row-start-1 h-12 w-full border-0 bg-transparent pl-11 pr-4 text-base text-light-900 placeholder:text-light-700 focus:outline-none focus:ring-0 dark:text-dark-900 dark:placeholder:text-dark-700 sm:text-sm"
                  placeholder="Search boards and cards..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <HiMagnifyingGlass
                  className="pointer-events-none col-start-1 row-start-1 ml-4 size-5 self-center text-light-700 dark:text-dark-700"
                  aria-hidden="true"
                />
              </div>

              {results.length > 0 && (
                <ComboboxOptions
                  static
                  className="max-h-72 scroll-py-2 overflow-y-auto py-2"
                >
                  {results.map((result) => (
                    <ComboboxOption
                      key={`${result.type}-${result.publicId}`}
                      value={result}
                      className="group"
                    >
                      <Link
                        href={
                          result.type === "board"
                            ? `/boards/${result.publicId}`
                            : `/cards/${result.publicId}`
                        }
                        className="block cursor-pointer select-none px-4 py-3 data-[focus]:bg-light-200 hover:bg-light-200 focus:outline-none dark:data-[focus]:bg-dark-200 dark:hover:bg-dark-200"
                        onClick={() => {
                          onClose();
                          setQuery("");
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1 text-left">
                            <div className="truncate text-sm font-bold text-light-900 dark:text-dark-900">
                              {result.title}
                            </div>
                            {result.type === "card" && (
                              <div className="truncate text-xs text-light-700 dark:text-dark-700">
                                {`${t`in`} ${result.boardName} → ${result.listName}`}
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    </ComboboxOption>
                  ))}
                </ComboboxOptions>
              )}

              {hasSearched && !isLoading && results.length === 0 && (
                <div className="p-4 text-sm text-light-950 dark:text-dark-950">
                  {t`No results found for "${query}".`}
                </div>
              )}
            </Combobox>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
