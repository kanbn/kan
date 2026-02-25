import { useRouter } from "next/navigation";
import { t } from "@lingui/core/macro";

import Button from "~/components/Button";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

interface ArchiveCardConfirmationProps {
    cardPublicId: string;
    boardPublicId?: string;
}

export function ArchiveCardConfirmation({
    cardPublicId,
    boardPublicId,
}: ArchiveCardConfirmationProps) {
    const { closeModal } = useModal();
    const utils = api.useUtils();
    const router = useRouter();
    const { showPopup } = usePopup();

    const archiveCardMutation = api.card.archive.useMutation({
        onSuccess: () => {
            if (boardPublicId) {
                router.push(`/boards/${boardPublicId}`);
                utils.board.byId.invalidate({ boardPublicId });
            }
            closeModal();
        },
        onError: () => {
            showPopup({
                header: t`Unable to archive card`,
                message: t`Please try again.`,
                icon: "error",
            });
        },
    });

    const handleArchiveCard = () => {
        archiveCardMutation.mutate({
            cardPublicId,
        });
    };

    return (
        <div className="p-5">
            <div className="flex w-full flex-col justify-between pb-4">
                <h2 className="text-md pb-4 font-medium text-neutral-900 dark:text-dark-1000">
                    {t`Are you sure you want to archive this card?`}
                </h2>
            </div>
            <div className="mt-5 flex justify-end sm:mt-6">
                <button
                    className="mr-4 inline-flex justify-center rounded-md border-[1px] border-light-600 bg-light-50 px-3 py-2 text-sm font-semibold text-neutral-900 shadow-sm focus-visible:outline-none dark:border-dark-600 dark:bg-dark-300 dark:text-dark-1000"
                    onClick={() => closeModal()}
                >
                    {t`Cancel`}
                </button>
                <Button
                    onClick={handleArchiveCard}
                    isLoading={archiveCardMutation.isPending}
                >
                    {t`Archive`}
                </Button>
            </div>
        </div>
    );
}
