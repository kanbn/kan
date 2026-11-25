import Link from "next/link";
import { useParams } from "next/navigation";
import { t } from "@lingui/core/macro";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { HiEllipsisHorizontal, HiOutlineInboxStack } from "react-icons/hi2";

import type { ArchivedCardsDtoOutput } from "@kan/api-client/hooks";
import {
  getArchivedCards,
  getGetArchivedCardsQueryKey,
  useGetBoard,
} from "@kan/api-client/hooks";
import { authClient } from "@kan/auth/client";

import Button from "~/components/Button";
import Dropdown from "~/components/Dropdown";
import Input from "~/components/Input";
import LabelIcon from "~/components/LabelIcon";
import Modal from "~/components/modal";
import { PageHead } from "~/components/PageHead";
import { useCardArchive } from "~/hooks/useCardArchive";
import { useDebounce } from "~/hooks/useDebounce";
import { useLocalisation } from "~/hooks/useLocalisation";
import { usePermissions } from "~/hooks/usePermissions";
import { useModal } from "~/providers/modal";
import { DeleteCardConfirmation } from "~/views/card/components/DeleteCardConfirmation";

type ArchivedCard = ArchivedCardsDtoOutput["cards"][number];

const headerClass =
  "px-2 pb-2 text-left text-xs font-medium whitespace-nowrap text-light-900 dark:text-dark-900";

export default function ArchivedCardsView() {
  const params = useParams() as { boardId: string } | null;
  const boardPublicId = params?.boardId ?? "";
  const enabled = boardPublicId.length >= 12;

  const { data: session } = authClient.useSession();
  const { modalContentType, entityId, isOpen, openModal } = useModal();
  const { canEditCard, canDeleteCard } = usePermissions();
  const { dateLocale } = useLocalisation();
  const { unarchive } = useCardArchive();
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search.trim(), 300);

  const { data: board } = useGetBoard(
    boardPublicId,
    { cardView: "summary" },
    { query: { enabled, select: (res) => res.data } },
  );

  const query = debouncedSearch ? { search: debouncedSearch } : undefined;
  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: [
      ...getGetArchivedCardsQueryKey(boardPublicId, query),
      "infinite",
    ],
    queryFn: ({ pageParam, signal }) =>
      getArchivedCards(boardPublicId, { ...query, ...pageParam }, { signal }),
    initialPageParam: {},
    getNextPageParam: ({ data: page }) =>
      page.nextCursor && page.nextCursorPublicId
        ? {
            cursor: page.nextCursor,
            cursorPublicId: page.nextCursorPublicId,
          }
        : undefined,
    placeholderData: keepPreviousData,
    enabled,
  });

  const cards = data?.pages.flatMap((page) => page.data.cards) ?? [];
  const cardPrefix = board?.workspace.cardPrefix;

  const renderRow = (card: ArchivedCard) => {
    const isCreator = !!card.createdBy && card.createdBy === session?.user.id;
    const archivedAgo = formatDistanceToNow(new Date(card.archivedAt), {
      addSuffix: true,
      locale: dateLocale,
    });
    const archivedByName = card.archivedBy?.name;

    const items = [
      ...(canEditCard || isCreator
        ? [
            {
              label: t`Unarchive card`,
              action: () => unarchive.mutate({ cardPublicId: card.publicId }),
            },
          ]
        : []),
      ...(canDeleteCard || isCreator
        ? [
            {
              label: t`Delete card`,
              action: () => openModal("DELETE_CARD", card.publicId),
            },
          ]
        : []),
    ];

    return (
      <tr
        key={card.publicId}
        className="group/row h-14 transition-colors hover:bg-light-200 dark:hover:bg-dark-100"
      >
        <td className="w-full max-w-0 px-2">
          <Link
            href={`/cards/${card.publicId}`}
            className="block truncate text-sm font-medium text-neutral-900 hover:underline dark:text-dark-1000"
          >
            {card.title}
          </Link>
          <div className="flex items-center gap-2 overflow-hidden text-xs whitespace-nowrap text-light-900 dark:text-dark-900">
            {cardPrefix && card.cardNumber != null && (
              <span>
                {cardPrefix}-{card.cardNumber}
              </span>
            )}
            {card.labels.map((label) => (
              <span
                key={label.publicId}
                className="inline-flex items-center gap-1"
              >
                <LabelIcon colourCode={label.colourCode} />
                {label.name}
              </span>
            ))}
          </div>
        </td>
        <td className="hidden max-w-[160px] truncate px-2 text-xs text-light-950 sm:table-cell dark:text-dark-950">
          {card.list.name}
        </td>
        <td className="px-2 text-xs whitespace-nowrap text-light-950 dark:text-dark-950">
          <p>{archivedAgo}</p>
          {archivedByName && (
            <p className="text-light-900 dark:text-dark-900">
              {t`by ${archivedByName}`}
            </p>
          )}
        </td>
        <td className="w-10 px-2">
          {items.length > 0 && (
            <div className="relative transition-opacity md:opacity-0 md:group-focus-within/row:opacity-100 md:group-hover/row:opacity-100">
              <Dropdown
                items={items}
                ariaLabel={t`Card options`}
                buttonClassName="h-6 w-6 hover:bg-light-400 dark:hover:bg-dark-300"
              >
                <HiEllipsisHorizontal
                  size={16}
                  className="text-light-900 dark:text-dark-900"
                />
              </Dropdown>
            </div>
          )}
        </td>
      </tr>
    );
  };

  const renderSkeletonRow = (key: number) => (
    <tr key={key} className="h-14">
      <td className="w-full max-w-0 px-2" colSpan={4}>
        <div className="h-3 w-[180px] animate-pulse rounded-xs bg-light-200 dark:bg-dark-200" />
      </td>
    </tr>
  );

  return (
    <>
      <PageHead title={t`Archived cards | ${board?.name ?? t`Board`}`} />
      <div className="m-auto h-full max-w-[1100px] p-6 px-5 md:px-28 md:py-12">
        <div className="mb-8 flex w-full flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/boards/${boardPublicId}`}
              className="block h-5 truncate text-xs text-light-900 hover:text-light-1000 dark:text-dark-900 dark:hover:text-dark-1000"
            >
              {board?.name}
            </Link>
            <h1 className="font-bold tracking-tight text-neutral-900 sm:text-base dark:text-dark-1000">
              {t`Archived cards`}
            </h1>
          </div>
          <div className="w-full sm:w-56">
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t`Search archived cards...`}
              aria-label={t`Search archived cards`}
              maxLength={200}
            />
          </div>
        </div>

        {isError ? (
          <p className="text-sm text-light-900 dark:text-dark-900">
            {t`Unable to load archived cards.`}
          </p>
        ) : !isLoading && cards.length === 0 ? (
          <div className="flex flex-col items-center py-20">
            <HiOutlineInboxStack className="h-7 w-7 text-light-800 dark:text-dark-800" />
            <p className="mt-3 mb-1 text-sm font-medium text-light-1000 dark:text-dark-1000">
              {debouncedSearch ? t`No matching cards` : t`No archived cards`}
            </p>
            {!debouncedSearch && (
              <p className="text-xs text-light-900 dark:text-dark-900">
                {t`Cards you archive will appear here.`}
              </p>
            )}
          </div>
        ) : (
          <div className="-mx-2 pb-16">
            <table className="min-w-full">
              <thead className="border-b border-light-400 dark:border-dark-300">
                <tr>
                  <th scope="col" className={headerClass}>{t`Card`}</th>
                  <th
                    scope="col"
                    className={`hidden sm:table-cell ${headerClass}`}
                  >{t`List`}</th>
                  <th scope="col" className={headerClass}>{t`Archived`}</th>
                  <th scope="col" className={headerClass}>
                    <span className="sr-only">{t`Card options`}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-300 dark:divide-dark-200">
                {isLoading
                  ? [0, 1, 2].map(renderSkeletonRow)
                  : cards.map(renderRow)}
              </tbody>
            </table>
            {hasNextPage && (
              <div className="mt-4 flex justify-center">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => fetchNextPage()}
                  isLoading={isFetchingNextPage}
                >
                  {t`Load more`}
                </Button>
              </div>
            )}
          </div>
        )}

        <Modal
          modalSize="sm"
          isVisible={isOpen && modalContentType === "DELETE_CARD"}
        >
          <DeleteCardConfirmation
            cardPublicId={entityId}
            boardPublicId={boardPublicId}
            returnUrl={`/boards/${boardPublicId}/archived`}
          />
        </Modal>
      </div>
    </>
  );
}
