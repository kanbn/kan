import type { DraggableProvided } from "react-beautiful-dnd";
import { Combobox, Transition } from "@headlessui/react";
import { t } from "@lingui/core/macro";
import { Fragment, useState } from "react";
import { HiChevronUpDown, HiXMark } from "react-icons/hi2";
import { RiDraggable } from "react-icons/ri";
import { twMerge } from "tailwind-merge";

import PlainTextEditor from "~/components/PlainTextEditor";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";
import { invalidateCard } from "~/utils/cardInvalidation";

interface BlockerChip {
  publicId: string;
  title: string;
  cardNumber: number | null;
}

interface ChecklistItemRowProps {
  item: {
    publicId: string;
    title: string;
    completed: boolean;
    blockedBy: BlockerChip[];
  };
  cardPublicId: string;
  cardPrefix: string;
  onCreateNewItem?: () => void;
  viewOnly?: boolean;
  dragHandleProps?: DraggableProvided["dragHandleProps"];
  isDragging?: boolean;
}

export default function ChecklistItemRow({
  item,
  cardPublicId,
  cardPrefix,
  onCreateNewItem,
  viewOnly = false,
  dragHandleProps,
  isDragging = false,
}: ChecklistItemRowProps) {
  const utils = api.useUtils();
  const { showPopup } = usePopup();
  const [completed, setCompleted] = useState(item.completed);
  const [showBlockerCombobox, setShowBlockerCombobox] = useState(false);
  const [blockerSearch, setBlockerSearch] = useState("");

  const workspacePublicId =
    utils.card.byId.getData({ cardPublicId })?.list.board.workspace.publicId ??
    "";

  const { data: searchResults } = api.workspace.search.useQuery(
    {
      workspacePublicId,
      query: blockerSearch,
    },
    { enabled: showBlockerCombobox && blockerSearch.length > 0 },
  );

  const alreadyBlockedIds = new Set(
    (item.blockedBy || []).map((b) => b.publicId),
  );
  alreadyBlockedIds.add(cardPublicId);

  const blockerCandidates =
    searchResults?.filter(
      (r) => r.type === "card" && !alreadyBlockedIds.has(r.publicId),
    ) ?? [];

  const updateItem = api.checklist.updateItem.useMutation({
    onMutate: async (vars) => {
      await utils.card.byId.cancel({ cardPublicId });
      const previous = utils.card.byId.getData({ cardPublicId });
      utils.card.byId.setData({ cardPublicId }, (old) => {
        if (!old) return old as any;
        const updatedChecklists = old.checklists.map((cl) => ({
          ...cl,
          items: cl.items.map((ci) =>
            ci.publicId === item.publicId
              ? {
                  ...ci,
                  ...(vars.title !== undefined ? { title: vars.title } : {}),
                  ...(vars.completed !== undefined
                    ? { completed: vars.completed }
                    : {}),
                }
              : ci,
          ),
        }));
        return { ...old, checklists: updatedChecklists } as typeof old;
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous)
        utils.card.byId.setData({ cardPublicId }, ctx.previous);
      showPopup({
        header: t`Unable to update checklist item`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      await invalidateCard(utils, cardPublicId);
    },
  });

  const deleteItem = api.checklist.deleteItem.useMutation({
    onMutate: async () => {
      await utils.card.byId.cancel({ cardPublicId });
      const previous = utils.card.byId.getData({ cardPublicId });
      utils.card.byId.setData({ cardPublicId }, (old) => {
        if (!old) return old as any;
        const updatedChecklists = old.checklists.map((cl) => ({
          ...cl,
          items: cl.items.filter((ci) => ci.publicId !== item.publicId),
        }));
        return { ...old, checklists: updatedChecklists } as typeof old;
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous)
        utils.card.byId.setData({ cardPublicId }, ctx.previous);
      showPopup({
        header: t`Unable to delete checklist item`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      await invalidateCard(utils, cardPublicId);
    },
  });

  const addOrRemoveBlocker = api.checklist.addOrRemoveBlocker.useMutation({
    onSettled: async () => {
      await invalidateCard(utils, cardPublicId);
    },
  });

  const handleToggleCompleted = () => {
    if (viewOnly) return;
    setCompleted((prev) => !prev);
    updateItem.mutate({
      checklistItemPublicId: item.publicId,
      completed: !completed,
    });
  };

  const commitTitle = (plain: string) => {
    if (!plain || plain === item.title) return;
    updateItem.mutate({
      checklistItemPublicId: item.publicId,
      title: plain,
    });
  };

  const handleDelete = () => {
    if (viewOnly) return;
    deleteItem.mutate({ checklistItemPublicId: item.publicId });
  };

  const handleRemoveBlocker = (blockerPublicId: string) => {
    addOrRemoveBlocker.mutate({
      checklistItemPublicId: item.publicId,
      blockerCardPublicId: blockerPublicId,
    });
  };

  const handleAddBlocker = (blockerPublicId: string) => {
    addOrRemoveBlocker.mutate({
      checklistItemPublicId: item.publicId,
      blockerCardPublicId: blockerPublicId,
    });
    setShowBlockerCombobox(false);
    setBlockerSearch("");
  };

  return (
    <div
      className={twMerge(
        "group relative flex flex-col items-start gap-1 rounded-md py-2 pl-4 hover:bg-light-100 dark:hover:bg-dark-100",
        isDragging && "opacity-80",
      )}
    >
      <div className="flex w-full items-start gap-3">
        {!viewOnly && (
          <div
            {...dragHandleProps}
            className="absolute left-0 top-1/2 flex h-[20px] w-[20px] -translate-x-full -translate-y-1/2 cursor-grab items-center justify-center pr-1 opacity-0 transition-opacity group-hover:opacity-75 hover:opacity-100 active:cursor-grabbing"
          >
            <RiDraggable className="h-4 w-4 text-light-700 dark:text-dark-700" />
          </div>
        )}

        {viewOnly && <div className="w-[20px] flex-shrink-0" />}

        <label
          className={`relative mt-[2px] inline-flex h-[16px] w-[16px] flex-shrink-0 items-center justify-center`}
        >
          <input
            type="checkbox"
            checked={completed}
            onChange={(e) => {
              if (viewOnly) {
                e.preventDefault();
                return;
              }
              handleToggleCompleted();
            }}
            className={twMerge(
              "h-[16px] w-[16px] appearance-none rounded-md border border-light-500 bg-transparent outline-none ring-0 checked:bg-blue-600 focus:shadow-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none dark:border-dark-500 dark:hover:border-dark-500",
              viewOnly ? "cursor-default" : "cursor-pointer",
            )}
          />
        </label>

        <div className="flex-1 pr-7">
          <PlainTextEditor
            key={item.publicId}
            content={item.title}
            readOnly={viewOnly}
            placeholder={t`Add details...`}
            onBlur={commitTitle}
            onEnter={(plain) => {
              commitTitle(plain);
              onCreateNewItem?.();
            }}
            onEscape={() => undefined}
            className={twMerge(
              "m-0 min-h-[20px] w-full p-0 text-sm leading-[20px] text-light-950 dark:text-dark-950",
              viewOnly && "cursor-default",
            )}
          />
        </div>

        {!viewOnly && (
          <button
            type="button"
            onClick={handleDelete}
            className="absolute right-1 top-1/2 hidden -translate-y-1/2 rounded-md p-1 text-light-900 group-hover:block hover:bg-light-200 dark:text-dark-700 dark:hover:bg-dark-200"
          >
            <HiXMark size={16} />
          </button>
        )}
      </div>

      {/* Blocker chips */}
      {(item.blockedBy || []).length > 0 && (
        <div className="ml-9 flex flex-wrap items-center gap-1">
          {item.blockedBy.map((blocker) => (
            <span
              key={blocker.publicId}
              className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300"
            >
              <a
                href={`/cards/${blocker.publicId}`}
                className="hover:underline"
              >
                {blocker.cardNumber != null
                  ? `${cardPrefix}-${blocker.cardNumber}`
                  : blocker.title}
              </a>
              {!viewOnly && (
                <button
                  type="button"
                  onClick={() => handleRemoveBlocker(blocker.publicId)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-red-200 dark:hover:bg-red-800/50"
                >
                  <HiXMark size={12} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Add blocker button */}
      {!viewOnly && (
        <div className="ml-9">
          {showBlockerCombobox ? (
            <Combobox
              onChange={(value: string) => {
                if (value) handleAddBlocker(value);
              }}
            >
              <div className="relative mt-1">
                <div className="relative w-full cursor-default overflow-hidden rounded-lg border border-light-300 bg-white text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 dark:border-dark-300 dark:bg-dark-100 sm:text-sm">
                  <Combobox.Input
                    className="w-full border-none py-1 pl-3 pr-10 text-sm leading-5 text-light-900 focus:ring-0 dark:bg-dark-100 dark:text-dark-900"
                    displayValue={() => ""}
                    placeholder={t`Search cards...`}
                    onChange={(e) => setBlockerSearch(e.target.value)}
                    onBlur={() => {
                      if (!blockerSearch) setShowBlockerCombobox(false);
                    }}
                  />
                  <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <HiChevronUpDown
                      className="h-4 w-4 text-light-400"
                      aria-hidden="true"
                    />
                  </Combobox.Button>
                </div>
                <Transition
                  as={Fragment}
                  leave="transition ease-in duration-100"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                  afterLeave={() => setBlockerSearch("")}
                >
                  <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none dark:bg-dark-100 sm:text-sm">
                    {blockerCandidates.length === 0 && blockerSearch ? (
                      <div className="relative cursor-default select-none px-4 py-2 text-light-700 dark:text-dark-700">
                        {t`Nothing found.`}
                      </div>
                    ) : (
                      blockerCandidates.map((candidate) => (
                        <Combobox.Option
                          key={candidate.publicId}
                          value={candidate.publicId}
                          className={({ active }) =>
                            `relative cursor-default select-none py-2 pl-10 pr-4 ${
                              active
                                ? "bg-teal-600 text-white"
                                : "text-light-900 dark:text-dark-900"
                            }`
                          }
                        >
                          {candidate.title}
                        </Combobox.Option>
                      ))
                    )}
                  </Combobox.Options>
                </Transition>
              </div>
            </Combobox>
          ) : (
            <button
              type="button"
              onClick={() => setShowBlockerCombobox(true)}
              className="mt-1 text-xs text-light-700 hover:text-light-900 dark:text-dark-700 dark:hover:text-dark-900"
            >
              + {t`Add blocker`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
