import { t } from "@lingui/core/macro";
import { formatDistanceToNow } from "date-fns";
import * as React from "react";
import { HiOutlineArchiveBoxXMark, HiXMark } from "react-icons/hi2";

import { useModal } from "~/providers/modal";
import { usePermissions } from "~/hooks/usePermissions";
import { api } from "~/utils/api";
import Button from "~/components/Button";

interface Props {
  boardPublicId: string;
}

export default function ArchivedCardsModal({ boardPublicId }: Props) {
  const { closeModal } = useModal();
  const utils = api.useUtils();
  const { canArchiveCard } = usePermissions();

  const { data: archivedCards, isLoading } = api.board.archivedCards.useQuery(
    { boardPublicId },
    { enabled: !!boardPublicId }
  );

  const unarchiveMutation = api.card.unarchive.useMutation({
    onSuccess: () => {
      utils.board.archivedCards.invalidate({ boardPublicId });
      utils.board.byId.invalidate({ boardPublicId });
    },
  });

  const handleUnarchive = (cardPublicId: string) => {
    unarchiveMutation.mutate({ cardPublicId });
  };

  return (
    <div className="flex h-full w-full flex-col px-5 pt-5">
      <div className="flex w-full items-center justify-between pb-5">
        <h2 className="text-sm font-bold text-neutral-900 dark:text-dark-1000">
          {t`Archived Cards`}
        </h2>
        <button
          type="button"
          className="rounded p-1 hover:bg-light-200 focus:outline-none dark:hover:bg-dark-300"
          onClick={(e) => {
            closeModal();
            e.preventDefault();
          }}
        >
          <HiXMark size={18} className="text-light-900 dark:text-dark-900" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto pb-5 scrollbar scrollbar-track-light-200 scrollbar-thumb-light-400 dark:scrollbar-track-dark-100 dark:scrollbar-thumb-dark-300">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary-500"></div>
          </div>
        ) : !archivedCards || archivedCards.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <HiOutlineArchiveBoxXMark className="mb-4 h-12 w-12 text-neutral-800 dark:text-dark-900" />
            <p className="text-sm font-medium text-neutral-800 dark:text-dark-900">{t`No archived cards`}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {archivedCards.map((card) => (
              <div key={card.id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-md border-[1px] border-light-200 bg-white p-4 shadow-sm dark:border-dark-300 dark:bg-dark-100">
                <div className="mb-3 sm:mb-0 max-w-[70%]">
                  <p className="truncate font-semibold text-neutral-900 dark:text-dark-1000" title={card.title}>{card.title}</p>
                  <div className="mt-1 flex items-center text-xs text-neutral-500 dark:text-dark-800">
                    <span className="truncate max-w-[120px]" title={card.listName}>{t`in ${card.listName}`}</span>
                    {card.archivedAt && (
                      <>
                        <span className="mx-1">•</span>
                        <span>{t`Archived ${formatDistanceToNow(new Date(card.archivedAt), { addSuffix: true })}`}</span>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  {canArchiveCard && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleUnarchive(card.publicId)}
                      disabled={unarchiveMutation.isPending}
                      isLoading={unarchiveMutation.isPending && unarchiveMutation.variables?.cardPublicId === card.publicId}
                    >
                      {t`Unarchive`}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
