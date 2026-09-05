import { enGB, fr } from "date-fns/locale";
import { describe, expect, it } from "vitest";

import { formatCustomFieldDate } from "./custom-field-date";

describe("custom field date display", () => {
  it("uses the active interface locale", () => {
    const value = new Date(2026, 8, 5, 12, 30);

    expect(formatCustomFieldDate(value, enGB)).toMatch(/^5 Sep 2026.*12:30$/);
    expect(formatCustomFieldDate(value, fr)).toMatch(/^5 sept\. 2026.*12:30$/);
  });
});
