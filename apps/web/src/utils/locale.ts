/**
 * Locale ids have no separator (e.g. "ptbr"), so a browser language such as
 * "pt-BR" is first matched as a whole. A bare or unsupported regional language
 * (e.g. "pt", "pt-PT") falls back to the base language or its first variant.
 */
export function matchBrowserLocale<T extends string>(
  browserLanguages: readonly string[],
  availableLocales: readonly T[],
): T | undefined {
  for (const browserLang of browserLanguages) {
    const normalized = browserLang.toLowerCase().replace(/[-_]/g, "");
    const langCode = browserLang.split(/[-_]/)[0]?.toLowerCase();

    if (!langCode) continue;

    const match =
      availableLocales.find((locale) => locale === normalized) ??
      availableLocales.find((locale) => locale === langCode) ??
      availableLocales.find((locale) => locale.startsWith(langCode));

    if (match) return match;
  }

  return undefined;
}
