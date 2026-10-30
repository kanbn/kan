import { describe, expect, it } from "vitest";

import { parseCardCoverDisplay } from "./cardCoverDisplay";

describe("parseCardCoverDisplay", () => {
  it.each(["prominent", "subdued", "hidden"] as const)(
    "accepts the %s display mode",
    (display) => {
      expect(parseCardCoverDisplay(display)).toBe(display);
    },
  );

  it("falls back to prominent for missing or unknown values", () => {
    expect(parseCardCoverDisplay(null)).toBe("prominent");
    expect(parseCardCoverDisplay("unknown")).toBe("prominent");
  });
});
