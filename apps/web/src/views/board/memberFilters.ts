interface BoardFilterMember {
  publicId: string;
  status: "active" | "invited" | "removed" | "paused";
}

export const getBoardFilterMembers = <T extends BoardFilterMember>(
  members: T[],
  assignedMemberPublicIds: ReadonlySet<string> | undefined,
) =>
  members
    .filter((member) => assignedMemberPublicIds?.has(member.publicId))
    .sort(
      (a, b) =>
        Number(a.status === "paused") - Number(b.status === "paused"),
    );
