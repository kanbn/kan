import { describe, expect, it } from "vitest";

import { getBoardFilterMembers } from "./memberFilters";

describe("getBoardFilterMembers", () => {
  const members = [
    {
      publicId: "paused-a",
      status: "paused" as const,
      user: { name: "Zoe", email: "zoe@example.com" },
    },
    {
      publicId: "active-a",
      status: "active" as const,
      user: { name: "Boris", email: "boris@example.com" },
    },
    {
      publicId: "unassigned",
      status: "active" as const,
      user: { name: "Aaron", email: "aaron@example.com" },
    },
    {
      publicId: "invited-a",
      status: "invited" as const,
      user: { name: "alice", email: "alice@example.com" },
    },
    {
      publicId: "paused-b",
      status: "paused" as const,
      user: { name: "Adam", email: "adam@example.com" },
    },
  ];

  it("sorts assigned members by name with paused members last", () => {
    const result = getBoardFilterMembers(
      members,
      new Set(["paused-a", "active-a", "invited-a", "paused-b"]),
      "en",
    );

    expect(result.map((member) => member.publicId)).toEqual([
      "invited-a",
      "active-a",
      "paused-b",
      "paused-a",
    ]);
  });

  it("returns no choices when no board assignments are available", () => {
    expect(getBoardFilterMembers(members, undefined, "en")).toEqual([]);
  });

  it("sorts unnamed members by their displayed email local part", () => {
    const result = getBoardFilterMembers(
      [
        {
          publicId: "zoe",
          status: "active" as const,
          user: { name: null, email: "zoe@example.com" },
        },
        {
          publicId: "anna",
          status: "active" as const,
          user: { name: "Anna", email: "other@example.com" },
        },
      ],
      new Set(["zoe", "anna"]),
      "en",
    );

    expect(result.map((member) => member.publicId)).toEqual(["anna", "zoe"]);
  });

  it("uses the interface locale for Cyrillic names", () => {
    const result = getBoardFilterMembers(
      [
        {
          publicId: "zoe",
          status: "active" as const,
          user: { name: "Zoe", email: "zoe@example.com" },
        },
        {
          publicId: "anna",
          status: "active" as const,
          user: { name: "Анна", email: "anna@example.com" },
        },
      ],
      new Set(["zoe", "anna"]),
      "ru",
    );

    expect(result.map((member) => member.publicId)).toEqual(["anna", "zoe"]);
  });
});
