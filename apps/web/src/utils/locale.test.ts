import { describe, expect, it } from "vitest";

import { matchBrowserLocale } from "./locale";

const locales = [
  "en",
  "fr",
  "de",
  "es",
  "it",
  "nl",
  "ru",
  "pl",
  "ptbr",
] as const;

describe("matchBrowserLocale", () => {
  it("matches a regional browser language to a regional locale", () => {
    expect(matchBrowserLocale(["pt-BR"], locales)).toBe("ptbr");
    expect(matchBrowserLocale(["pt_br"], locales)).toBe("ptbr");
  });

  it("falls back to the regional locale for a bare language", () => {
    expect(matchBrowserLocale(["pt"], locales)).toBe("ptbr");
    expect(matchBrowserLocale(["pt-PT"], locales)).toBe("ptbr");
  });

  it("matches the base language of a regional browser language", () => {
    expect(matchBrowserLocale(["fr-CA"], locales)).toBe("fr");
    expect(matchBrowserLocale(["en-US"], locales)).toBe("en");
  });

  it("respects the browser language order", () => {
    expect(matchBrowserLocale(["ja-JP", "de-DE", "en"], locales)).toBe("de");
  });

  it("returns undefined when nothing matches", () => {
    expect(matchBrowserLocale(["ja-JP", "zh-CN"], locales)).toBeUndefined();
    expect(matchBrowserLocale([], locales)).toBeUndefined();
  });
});
