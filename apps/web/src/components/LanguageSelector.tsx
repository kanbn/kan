import { HiLanguage } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import type { Locale } from "~/locales";
import { useLocalisation } from "~/hooks/useLocalisation";
import { localeNames } from "~/locales";

export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, availableLocales } = useLocalisation();

  return (
    <div className="relative">
      <HiLanguage
        className={twMerge(
          "pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400",
          compact && "left-3 h-4 w-4",
        )}
      />
      <select
        id="language-select"
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className={twMerge(
          "mt-8 block w-full max-w-[180px] rounded-lg border-0 bg-light-50 pl-10 text-sm shadow-xs ring-1 ring-light-300 ring-inset focus:ring-2 focus:ring-light-400 focus:ring-inset dark:bg-dark-50 dark:text-dark-1000 dark:ring-dark-300 dark:focus:ring-dark-500",
          compact &&
            "mt-0 max-w-[160px] py-1.5 pl-9 text-xs text-light-950 shadow-none dark:text-dark-900",
        )}
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
