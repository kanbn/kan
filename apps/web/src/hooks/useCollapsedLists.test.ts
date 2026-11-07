import { describe, expect, it } from "vitest";

import { parseCollapsedListIds } from "./useCollapsedLists";

describe("parseCollapsedListIds", () => {
  it("returns stored list public IDs", () => {
    expect(parseCollapsedListIds('["list-1","list-2"]')).toEqual([
      "list-1",
      "list-2",
    ]);
  });

  it("removes duplicates and invalid values", () => {
    expect(
      parseCollapsedListIds('["list-1",null,42,"list-1","list-2"]'),
    ).toEqual(["list-1", "list-2"]);
  });

  it.each([null, "", "not-json", "{}", "true"])(
    "falls back for invalid storage: %s",
    (value) => {
      expect(parseCollapsedListIds(value)).toEqual([]);
    },
  );
});
