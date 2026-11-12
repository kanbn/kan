import type { BoardDetailDtoOutputWorkspaceMembersItemStatus } from "@kan/api-client/hooks";

import { formatMemberDisplayName } from "../../utils/helpers";

interface BoardFilterMember {
  publicId: string;
  status: BoardDetailDtoOutputWorkspaceMembersItemStatus;
  user: { name: string | null; email: string } | null;
}

export const getBoardFilterMembers = <T extends BoardFilterMember>(
  members: T[],
  assignedMemberPublicIds: ReadonlySet<string> | undefined,
  locale: string,
) => {
  const memberNameCollator = new Intl.Collator(
    locale === "ptbr" ? "pt-BR" : locale,
    { sensitivity: "base" },
  );

  const name = (member: T) =>
    formatMemberDisplayName(
      member.user?.name ?? null,
      member.user?.email ?? null,
    );

  return members
    .filter((member) => assignedMemberPublicIds?.has(member.publicId))
    .sort(
      (a, b) =>
        Number(a.status === "paused") - Number(b.status === "paused") ||
        memberNameCollator.compare(name(a), name(b)),
    );
};
