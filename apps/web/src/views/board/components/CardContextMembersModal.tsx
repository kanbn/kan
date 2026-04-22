import { useRouter } from "next/router";
import { t } from "@lingui/core/macro";
import { HiMiniPlus } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import Avatar from "~/components/Avatar";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";
import { invalidateCard } from "~/utils/cardInvalidation";
import { formatMemberDisplayName, getAvatarUrl } from "~/utils/helpers";

export function CardContextMembersModal() {
  const router = useRouter();
  const { entityId: cardPublicId, closeModal, openModal } = useModal();
  const utils = api.useUtils();
  const { showPopup } = usePopup();

  const { data: card, isLoading } = api.card.byId.useQuery(
    { cardPublicId: cardPublicId ?? "" },
    { enabled: !!cardPublicId && cardPublicId.length >= 12 },
  );

  const workspaceMembers = card?.list?.board?.workspace?.members ?? [];
  const selectedMemberIds = new Set(
    (card?.members ?? []).map((m) => m.publicId),
  );

  const addOrRemoveMember = api.card.addOrRemoveMember.useMutation({
    onMutate: async (update) => {
      await utils.card.byId.cancel();
      const previousCard = utils.card.byId.getData({
        cardPublicId: cardPublicId ?? "",
      });

      utils.card.byId.setData(
        { cardPublicId: cardPublicId ?? "" },
        (oldCard) => {
          if (!oldCard) return oldCard;

          const hasMember = oldCard.members.some(
            (member) => member.publicId === update.workspaceMemberPublicId,
          );

          const workspaceMember = oldCard.list.board.workspace.members.find(
            (member) => member.publicId === update.workspaceMemberPublicId,
          );

          const updatedMembers = hasMember
            ? oldCard.members.filter(
                (member) => member.publicId !== update.workspaceMemberPublicId,
              )
            : [
                ...oldCard.members,
                {
                  publicId: update.workspaceMemberPublicId,
                  email: workspaceMember?.email ?? "",
                  deletedAt: null,
                  user: {
                    id: workspaceMember?.user?.id ?? "",
                    name: workspaceMember?.user?.name ?? "",
                  },
                },
              ];

          return { ...oldCard, members: updatedMembers };
        },
      );

      return { previousCard };
    },
    onError: (_error, _update, context) => {
      utils.card.byId.setData(
        { cardPublicId: cardPublicId ?? "" },
        context?.previousCard,
      );
      showPopup({
        header: t`Unable to update members`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      if (cardPublicId) await invalidateCard(utils, cardPublicId);
      await utils.board.byId.invalidate();
    },
  });

  const handleInviteMember = async () => {
    await router.push(`/members`);
    openModal("INVITE_MEMBER");
  };

  if (!cardPublicId) return null;

  return (
    <div className="p-4">
      <h2 className="mb-4 text-lg font-semibold text-light-1000 dark:text-dark-1000">
        {t`Manage members`}
      </h2>

      {isLoading ? (
        <div className="h-10 w-full animate-pulse rounded bg-light-200 dark:bg-dark-300" />
      ) : workspaceMembers.length === 0 ? (
        <p className="mb-4 text-sm text-light-900 dark:text-dark-800">
          {t`No members in this workspace yet.`}
        </p>
      ) : (
        <div className="mb-4 flex flex-wrap gap-2">
          {workspaceMembers.map((member) => {
            const isSelected = selectedMemberIds.has(member.publicId);
            const displayName = formatMemberDisplayName(
              member.user?.name ?? null,
              member.user?.email ?? member.email,
            );
            const imageUrl = member.user?.image
              ? getAvatarUrl(member.user.image)
              : undefined;

            return (
              <button
                key={member.publicId}
                type="button"
                onClick={() =>
                  addOrRemoveMember.mutate({
                    cardPublicId,
                    workspaceMemberPublicId: member.publicId,
                  })
                }
                className={twMerge(
                  "inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-xs font-medium transition-colors",
                  "ring-1 ring-inset",
                  isSelected
                    ? "bg-light-300 text-neutral-900 ring-light-600 dark:bg-dark-400 dark:text-dark-1000 dark:ring-dark-700"
                    : "text-light-900 ring-light-400 hover:bg-light-200 dark:text-dark-900 dark:ring-dark-500 dark:hover:bg-dark-300",
                )}
              >
                <Avatar
                  size="sm"
                  name={member.user?.name ?? ""}
                  imageUrl={imageUrl}
                  email={member.user?.email ?? member.email}
                />
                <span>{displayName}</span>
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={handleInviteMember}
        className="flex w-full items-center gap-1.5 rounded-md border border-dashed border-light-400 px-3 py-2 text-sm text-light-900 hover:bg-light-200 dark:border-dark-500 dark:text-dark-900 dark:hover:bg-dark-300"
      >
        <HiMiniPlus className="h-4 w-4" />
        {t`Invite member`}
      </button>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={closeModal}
          className="rounded-md border border-light-300 bg-light-50 px-3 py-1.5 text-sm font-medium text-light-1000 hover:bg-light-200 dark:border-dark-400 dark:bg-dark-200 dark:text-dark-1000 dark:hover:bg-dark-300"
        >
          {t`Done`}
        </button>
      </div>
    </div>
  );
}
