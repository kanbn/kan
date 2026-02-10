import { t } from "@lingui/core/macro";

import { useModal } from "~/providers/modal";
import { api } from "~/utils/api";
import { formatMemberDisplayName, getAvatarUrl } from "~/utils/helpers";
import Avatar from "~/components/Avatar";
import MemberSelector from "~/views/card/components/MemberSelector";

export function CardContextMembersModal() {
  const { entityId: cardPublicId, closeModal } = useModal();
  const utils = api.useUtils();

  const { data: card, isLoading } = api.card.byId.useQuery(
    { cardPublicId: cardPublicId ?? "" },
    { enabled: !!cardPublicId && cardPublicId.length >= 12 },
  );

  const board = card?.list?.board;
  const workspaceMembers = board?.workspace?.members ?? [];
  const selectedMembers = card?.members ?? [];

  const formattedMembers = workspaceMembers.map((member) => {
    const isSelected = selectedMembers.some(
      (m) => m.publicId === member.publicId,
    );
    return {
      key: member.publicId,
      value: formatMemberDisplayName(
        member.user?.name ?? null,
        member.user?.email ?? member.email,
      ),
      imageUrl: member.user?.image ? getAvatarUrl(member.user.image) : undefined,
      selected: isSelected,
      leftIcon: (
        <Avatar
          size="xs"
          name={member.user?.name ?? ""}
          imageUrl={
            member.user?.image ? getAvatarUrl(member.user.image) : undefined
          }
          email={member.user?.email ?? member.email}
        />
      ),
    };
  });

  if (!cardPublicId) return null;

  return (
    <div className="p-4">
      <h2 className="mb-4 text-lg font-semibold text-light-1000 dark:text-dark-1000">
        {t`Manage members`}
      </h2>
      {isLoading ? (
        <div className="h-10 w-full animate-pulse rounded bg-light-200 dark:bg-dark-300" />
      ) : (
        <MemberSelector
          cardPublicId={cardPublicId}
          members={formattedMembers}
          isLoading={isLoading}
        />
      )}
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
