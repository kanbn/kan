import { describe, expect, it } from "vitest";

import { getBoardFilterMembers } from "./memberFilters";

describe("getBoardFilterMembers", () => {
  const members = [
    { publicId: "paused-a", status: "paused" as const },
    { publicId: "active-a", status: "active" as const },
    { publicId: "unassigned", status: "active" as const },
    { publicId: "invited-a", status: "invited" as const },
    { publicId: "paused-b", status: "paused" as const },
  ];

  it("keeps assigned members and places paused members last", () => {
    const result = getBoardFilterMembers(
      members,
      new Set(["paused-a", "active-a", "invited-a", "paused-b"]),
    );

    expect(result.map((member) => member.publicId)).toEqual([
      "active-a",
      "invited-a",
      "paused-a",
      "paused-b",
    ]);
  });

  it("returns no choices when no board assignments are available", () => {
    expect(getBoardFilterMembers(members, undefined)).toEqual([]);
  });
});
