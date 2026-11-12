import { t } from "@lingui/core/macro";

import type { CardDetailDtoOutput } from "@kan/api-client/hooks";

import Avatar from "~/components/Avatar";
import { formatMemberDisplayName, getAvatarUrl } from "~/utils/helpers";

type WorkspaceMember =
  CardDetailDtoOutput["list"]["board"]["workspace"]["members"][number];

// Paused members can't be newly assigned, but stay listed (and removable) on
// cards they're already assigned to.
export const getCardMemberOptions = (
  workspaceMembers: WorkspaceMember[],
  selectedPublicIds: string[],
) =>
  workspaceMembers.flatMap((member) => {
    const selected = selectedPublicIds.includes(member.publicId);
    if (member.status === "paused" && !selected) return [];

    const email = member.user?.email ?? member.email;
    const displayName = formatMemberDisplayName(
      member.user?.name ?? null,
      email,
    );
    const imageUrl = member.user?.image
      ? getAvatarUrl(member.user.image)
      : undefined;

    return [
      {
        key: member.publicId,
        value:
          member.status === "paused"
            ? `${displayName} (${t`Paused`})`
            : displayName,
        imageUrl,
        selected,
        email,
        userId: member.user?.id ?? null,
        name: member.user?.name ?? null,
        status: member.status,
        leftIcon: (
          <Avatar
            size="xs"
            name={member.user?.name ?? ""}
            imageUrl={imageUrl}
            email={email}
            paused={member.status === "paused"}
          />
        ),
      },
    ];
  });

// Editor mention suggestions: existing mentions keep their saved label, so
// paused members only need leaving out of new suggestions.
export const getMentionableMembers = (workspaceMembers: WorkspaceMember[]) =>
  workspaceMembers
    .filter((member) => member.email && member.status !== "paused")
    .map((member) => ({
      publicId: member.publicId,
      email: member.email,
      user: member.user
        ? {
            id: member.user.id,
            name: member.user.name ?? null,
            image: member.user.image ?? null,
          }
        : null,
    }));
