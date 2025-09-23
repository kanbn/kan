import { HiLanguage } from "react-icons/hi2";

import { useLocalisation } from "~/hooks/useLocalisation";
import { localeNames } from "~/locales";

export function LanguageSelector() {
  const { locale, setLocale, availableLocales } = useLocalisation();

  return (
    <div className="relative">
      <HiLanguage className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <select
        id="language-select"
        value={locale}
        onChange={(e) => setLocale(e.target.value as any)}
        className="mt-8 block w-full max-w-[180px] rounded-lg border-0 bg-light-50 pl-10 text-sm shadow-sm ring-1 ring-inset ring-light-300 focus:ring-2 focus:ring-inset focus:ring-light-400 dark:bg-dark-50 dark:text-dark-1000 dark:ring-dark-300 dark:focus:ring-dark-500"
      >
        {availableLocales.map((loc) => (
          <option key={loc} value={loc}>
            {localeNames[loc]}
          </option>
        ))}
      </select>
    </div>
  );
}
