import { formatMemberDisplayName } from "../../utils/helpers";

interface BoardFilterMember {
  publicId: string;
  status: "active" | "invited" | "removed" | "paused";
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

  return members
    .filter((member) => assignedMemberPublicIds?.has(member.publicId))
    .sort((a, b) => {
      const statusOrder =
        Number(a.status === "paused") - Number(b.status === "paused");
      if (statusOrder !== 0) return statusOrder;

      const aName = formatMemberDisplayName(
        a.user?.name ?? null,
        a.user?.email ?? null,
      );
      const bName = formatMemberDisplayName(
        b.user?.name ?? null,
        b.user?.email ?? null,
      );

      return memberNameCollator.compare(aName, bName);
    });
};
