import { describe, expect, it } from "vitest";

import { assertFound } from "../assert-found.util.js";

describe("assertFound", () => {
  it("returns the resolved value when present", async () => {
    await expect(assertFound(Promise.resolve({ id: 1 }), "missing")).resolves.toEqual(
      { id: 1 },
    );
  });

  it("throws NOT_FOUND with the given message when missing", async () => {
    await expect(
      assertFound(Promise.resolve(undefined), "List with public ID x not found"),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "List with public ID x not found",
    });
  });
});
