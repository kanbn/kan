import { t } from "@lingui/core/macro";
import { formatDistanceToNow } from "date-fns";
import * as React from "react";
import { HiOutlineTrash, HiXMark } from "react-icons/hi2";

import { useModal } from "~/providers/modal";
import { api } from "~/utils/api";
import Button from "~/components/Button";

interface Props {
  boardPublicId: string;
}

export default function TrashModal({ boardPublicId }: Props) {
  const { closeModal } = useModal();
  const utils = api.useUtils();

  const { data: trashedCards, isLoading } = api.board.trashedCards.useQuery(
    { boardPublicId },
    { enabled: !!boardPublicId }
  );

  const restoreMutation = api.card.restore.useMutation({
    onSuccess: () => {
      utils.board.trashedCards.invalidate({ boardPublicId });
      utils.board.byId.invalidate({ boardPublicId });
    },
  });

  const hardDeleteMutation = api.card.hardDelete.useMutation({
    onSuccess: () => {
      utils.board.trashedCards.invalidate({ boardPublicId });
    },
  });

  const handleRestore = (cardPublicId: string) => {
    restoreMutation.mutate({ cardPublicId });
  };

  const handleHardDelete = (cardPublicId: string) => {
    if (confirm(t`Are you sure you want to permanently delete this card? This action cannot be undone.`)) {
      hardDeleteMutation.mutate({ cardPublicId });
    }
  };

  return (
    <div className="flex h-full w-full flex-col px-5 pt-5">
      <div className="flex w-full items-center justify-between pb-5">
        <h2 className="text-sm font-bold text-neutral-900 dark:text-dark-1000">
          {t`Trash`}
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
        ) : !trashedCards || trashedCards.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <HiOutlineTrash className="mb-4 h-12 w-12 text-neutral-800 dark:text-dark-900" />
            <p className="text-sm font-medium text-neutral-800 dark:text-dark-900">{t`Trash is empty`}</p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-dark-800">{t`Cards you delete will appear here.`}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {trashedCards.map((card) => (
              <div key={card.id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-md border-[1px] border-light-200 bg-white p-4 shadow-sm dark:border-dark-300 dark:bg-dark-100">
                <div className="mb-3 sm:mb-0 max-w-[70%]">
                  <p className="truncate font-semibold text-neutral-900 dark:text-dark-1000" title={card.title}>{card.title}</p>
                  <div className="mt-1 flex items-center text-xs text-neutral-500 dark:text-dark-800">
                    <span className="truncate max-w-[120px]" title={card.listName}>{t`in ${card.listName}`}</span>
                    {card.deletedAt && (
                      <>
                        <span className="mx-1">•</span>
                        <span>{t`Deleted ${formatDistanceToNow(new Date(card.deletedAt), { addSuffix: true })}`}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleRestore(card.publicId)}
                    disabled={restoreMutation.isPending || hardDeleteMutation.isPending}
                    isLoading={restoreMutation.isPending && restoreMutation.variables?.cardPublicId === card.publicId}
                  >
                    {t`Restore`}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleHardDelete(card.publicId)}
                    disabled={restoreMutation.isPending || hardDeleteMutation.isPending}
                    isLoading={hardDeleteMutation.isPending && hardDeleteMutation.variables?.cardPublicId === card.publicId}
                  >
                    {t`Delete`}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
